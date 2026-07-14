import { asc, eq, inArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { getDb } from "@/db";
import { archiveRecords, beats, candidateFunnelItems, editorialRecommendations, researchActivity, researchCycles, researchRuns, researchStageBudgets, sources, stories, storyClusters } from "@/db/schema";
import { searchInternetArchive } from "@/lib/sources/internet-archive";
import { searchLibraryOfCongress } from "@/lib/sources/loc";
import type { ArchiveRecord, EditorialRecommendation } from "@/lib/types";
import { DEFAULT_BEATS, selectNextBeat } from "./beats";
import { buildCandidateFunnel, defaultStageBudget } from "./funnel";
import { makeDailyQueries } from "./queries";
import { buildResearchDecisions } from "./openai";

const DOSSIER_CONFIDENCE_THRESHOLD = 70;
const DOSSIER_COMPLETENESS_THRESHOLD = 72;

type CycleRow = InferSelectModel<typeof researchCycles>;

export async function runResearch() {
  const db = getDb();
  if (!db) return { ok: false, error: "DATABASE_URL is not configured" };

  await ensureBeats();
  const cycle = await claimNextCycle();
  if (!cycle) return { ok: true, status: "idle" };

  try {
    if (cycle.currentStage === "discovery") return await runDiscoveryStage(cycle);
    if (cycle.currentStage === "candidate_funnel") return await runCandidateFunnelStage(cycle);
    await logActivity(cycle, "stage_waiting", "Cycle stage waiting", `Stage ${cycle.currentStage} is waiting for the next implementation phase.`, {});
    return { ok: true, cycleId: cycle.id, stage: cycle.currentStage, status: "waiting" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(researchCycles).set({ status: "failed", error: message, completedAt: new Date(), updatedAt: new Date() }).where(eq(researchCycles.id, cycle.id));
    await logActivity(cycle, "error", "Research cycle failed", message, {});
    throw error;
  }
}

async function ensureBeats() {
  const db = getDb();
  if (!db) return;
  await db.insert(beats).values(DEFAULT_BEATS).onConflictDoNothing({ target: beats.slug });
}

async function claimNextCycle() {
  const db = getDb();
  if (!db) return undefined;
  const [existing] = await db.select().from(researchCycles)
    .where(inArray(researchCycles.status, ["queued", "running"]))
    .orderBy(asc(researchCycles.createdAt))
    .limit(1);
  if (existing) {
    const [claimed] = await db.update(researchCycles).set({ status: "running", lockedAt: new Date(), updatedAt: new Date() }).where(eq(researchCycles.id, existing.id)).returning();
    return claimed;
  }

  const activeBeats = await db.select().from(beats).where(eq(beats.active, true));
  const nextBeat = selectNextBeat(activeBeats.map((beat) => ({
    ...beat,
    querySeeds: Array.isArray(beat.querySeeds) ? beat.querySeeds : [],
  })));
  if (!nextBeat) return undefined;

  const [cycle] = await db.insert(researchCycles).values({
    beatId: nextBeat.id,
    status: "running",
    currentStage: "discovery",
    lockedAt: new Date(),
  }).returning();
  await db.update(beats).set({ lastScheduledAt: new Date(), updatedAt: new Date() }).where(eq(beats.id, nextBeat.id));
  return cycle;
}

async function runDiscoveryStage(cycle: CycleRow) {
  const db = getDb();
  if (!db) return { ok: false, error: "DATABASE_URL is not configured" };
  const beat = await getBeat(cycle.beatId);
  const budget = defaultStageBudget("discovery");
  await persistStageBudget(cycle, "discovery", budget, { usedSearches: Math.min(budget.maxSearches, 4) });
  const queries = makeDailyQueries(new Date(), beat?.querySeeds ?? undefined).slice(0, budget.maxSearches);
  const [run] = await db.insert(researchRuns).values({
    cycleId: cycle.id,
    beatId: cycle.beatId,
    status: "discovery_running",
    querySet: queries,
  }).returning();

  await logActivity(cycle, "search", "Scheduled beat discovery started", `Searching ${queries.length} archive queries for ${beat?.name ?? "the next beat"}.`, { queries });
  const records = dedupeRecords(await discoverRecords(queries)).slice(0, budget.maxRecords);
  await persistStageBudget(cycle, "discovery", budget, { usedRecords: records.length, usedSearches: queries.length });
  await persistArchiveRecords({ cycle, runId: run.id, records });
  await db.update(researchRuns).set({
    status: "discovery_completed",
    candidatesFound: records.length,
    completedAt: new Date(),
  }).where(eq(researchRuns.id, run.id));
  await db.update(researchCycles).set({
    status: "running",
    currentStage: "candidate_funnel",
    stageState: { queries, recordsFound: records.length, runId: run.id },
    updatedAt: new Date(),
  }).where(eq(researchCycles.id, cycle.id));
  await logActivity(cycle, "search", "Beat discovery completed", `Found ${records.length} unique raw archive records.`, { recordsFound: records.length, runId: run.id });

  return { ok: true, cycleId: cycle.id, beat: beat?.slug, stageCompleted: "discovery", nextStage: "candidate_funnel", recordsFound: records.length };
}

async function runCandidateFunnelStage(cycle: CycleRow) {
  const db = getDb();
  if (!db) return { ok: false, error: "DATABASE_URL is not configured" };
  const budget = defaultStageBudget("candidate_funnel");
  const rows = await db.select().from(archiveRecords).where(eq(archiveRecords.cycleId, cycle.id)).limit(budget.maxRecords);
  const records = rows.map((record) => ({
    id: record.externalId,
    title: record.title,
    url: record.url,
    date: record.recordDate ?? undefined,
    location: record.location ?? undefined,
    description: record.description ?? undefined,
    source: record.source === "internet_archive" ? "internet_archive" as const : "loc" as const,
  }));
  const decisions = buildCandidateFunnel(records, budget);
  const rowByExternalId = new Map(rows.map((record) => [record.externalId, record]));

  if (decisions.length) {
    await db.insert(candidateFunnelItems).values(decisions.map((decision) => {
      const archiveRecord = rowByExternalId.get(decision.record.id);
      return {
        cycleId: cycle.id,
        beatId: cycle.beatId,
        archiveRecordId: archiveRecord?.id,
        externalId: decision.record.id,
        title: decision.record.title,
        hypothesis: decision.hypothesis,
        normalizedKey: decision.normalizedKey,
        status: decision.status,
        rejectionCode: decision.rejectionCode,
        rejectionReason: decision.rejectionReason,
        duplicateOf: decision.duplicateOf,
        scores: decision.scores,
        evidenceSourceIds: [decision.record.id],
      };
    })).onConflictDoNothing({ target: [candidateFunnelItems.cycleId, candidateFunnelItems.externalId] }).catch(() => undefined);
  }

  const activeCount = decisions.filter((decision) => decision.status === "active").length;
  const rejectedCount = decisions.filter((decision) => decision.status === "rejected").length;
  const duplicateCount = decisions.filter((decision) => decision.status === "duplicate").length;
  await persistStageBudget(cycle, "candidate_funnel", budget, { usedRecords: decisions.length });
  await db.update(researchCycles).set({
    currentStage: "deep_research",
    stageState: { activeCount, rejectedCount, duplicateCount },
    updatedAt: new Date(),
  }).where(eq(researchCycles.id, cycle.id));
  await logActivity(cycle, "candidate_funnel", "Candidate funnel completed", `Kept ${activeCount}, rejected ${rejectedCount}, and merged ${duplicateCount} duplicate records.`, { activeCount, rejectedCount, duplicateCount });
  return { ok: true, cycleId: cycle.id, stageCompleted: "candidate_funnel", nextStage: "deep_research", activeCount, rejectedCount, duplicateCount };
}

async function getBeat(beatId: string | null) {
  const db = getDb();
  if (!db || !beatId) return undefined;
  return (await db.select().from(beats).where(eq(beats.id, beatId)).limit(1))[0];
}

async function discoverRecords(queries: string[], limit = 12) {
  const batches = await Promise.allSettled(queries.flatMap((query) => [
    searchLibraryOfCongress(query, limit),
    searchInternetArchive(query, limit),
  ]));
  return batches.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

function dedupeRecords(records: ArchiveRecord[]) {
  return Array.from(new Map(records.map((record) => [record.url, record])).values());
}

async function persistArchiveRecords({ cycle, runId, records }: { cycle: CycleRow; runId: string; records: ArchiveRecord[] }) {
  const db = getDb();
  if (!db || !records.length) return;
  await db.insert(archiveRecords).values(records.map((record) => ({
    cycleId: cycle.id,
    beatId: cycle.beatId,
    runId,
    externalId: record.id,
    source: record.source,
    url: record.url,
    title: record.title,
    recordDate: record.date,
    location: record.location,
    description: record.description,
  }))).catch(() => undefined);
}

async function persistStageBudget(cycle: CycleRow, stage: string, budget: ReturnType<typeof defaultStageBudget>, usage: Partial<{ usedRecords: number; usedSearches: number; usedModelCalls: number }>) {
  const db = getDb();
  if (!db) return;
  await db.insert(researchStageBudgets).values({
    cycleId: cycle.id,
    beatId: cycle.beatId,
    stage,
    maxRecords: budget.maxRecords,
    maxSearches: budget.maxSearches,
    maxModelCalls: budget.maxModelCalls,
    usedRecords: usage.usedRecords ?? 0,
    usedSearches: usage.usedSearches ?? 0,
    usedModelCalls: usage.usedModelCalls ?? 0,
  }).onConflictDoUpdate({
    target: [researchStageBudgets.cycleId, researchStageBudgets.stage],
    set: {
      maxRecords: budget.maxRecords,
      maxSearches: budget.maxSearches,
      maxModelCalls: budget.maxModelCalls,
      usedRecords: usage.usedRecords ?? 0,
      usedSearches: usage.usedSearches ?? 0,
      usedModelCalls: usage.usedModelCalls ?? 0,
      updatedAt: new Date(),
    },
  }).catch(() => undefined);
}

async function persistRecommendations(runId: string | undefined, recommendations: EditorialRecommendation[], records: ArchiveRecord[]) {
  const db = getDb();
  if (!db) return [];
  const saved: Array<{ recommendationId: string; storyId?: string }> = [];
  const ranked = recommendations
    .filter((recommendation) => !recommendation.downgradeReason || recommendation.confidence >= 55)
    .sort((a, b) => editorialScore(b) - editorialScore(a))
    .slice(0, 5);

  for (const recommendation of ranked) {
    const [cluster] = await db.insert(storyClusters).values({
      runId,
      status: recommendation.shouldCreateDossier ? "dossier_ready" : "recommended",
      label: recommendation.clusterLabel,
      hypothesis: recommendation.premise,
      mergeKey: recommendation.mergeKey,
      recordIds: recommendation.sourceIds,
      rejectionReason: recommendation.downgradeReason,
    }).returning();

    let storyId: string | undefined;
    if (recommendation.shouldCreateDossier && recommendation.dossier && recommendation.confidence >= DOSSIER_CONFIDENCE_THRESHOLD && recommendation.researchCompleteness >= DOSSIER_COMPLETENESS_THRESHOLD) {
      const [story] = await db.insert(stories).values({
        workingTitle: recommendation.workingTitle,
        category: recommendation.dossier.category,
        summary: recommendation.dossier.summary,
        eventDate: recommendation.dossier.eventDate,
        location: recommendation.dossier.location,
        status: "ready",
        interestScore: Math.round(recommendation.scores.humanInterest),
        sourceScore: Math.round(recommendation.scores.sourceStrength),
        competitionScore: Math.round(recommendation.scores.originality),
        confidenceScore: Math.round(recommendation.confidence),
        chronology: recommendation.dossier.chronology,
        keyFacts: recommendation.dossier.keyFacts,
        conflicts: recommendation.dossier.conflicts,
        titles: recommendation.dossier.titles,
        outline: recommendation.dossier.outline,
        premise: recommendation.premise,
        narrativeHook: recommendation.narrativeHook,
        whyOverlooked: recommendation.whyOverlooked,
        originalityAssessment: recommendation.originalityAssessment,
        unresolvedRisks: recommendation.unresolvedRisks,
        researchCompleteness: Math.round(recommendation.researchCompleteness),
        recommendedNextAction: recommendation.recommendedNextAction,
        claimCitations: recommendation.strongestEvidence.map(({ claim, sourceIds }) => ({ claim, sourceIds })),
      }).returning();
      storyId = story.id;
      await persistSources(story.id, recommendation.sourceIds, records);
      await logLegacyActivity(runId, "dossier", "Finished dossier generated", `${recommendation.workingTitle} met the confidence and evidence threshold.`, { storyId });
    } else if (recommendation.downgradeReason) {
      await logLegacyActivity(runId, "downgraded", "Investigation downgraded", `${recommendation.workingTitle}: ${recommendation.downgradeReason}`, { mergeKey: recommendation.mergeKey });
    }

    const [row] = await db.insert(editorialRecommendations).values({
      runId,
      clusterId: cluster.id,
      storyId,
      status: storyId ? "dossier_ready" : "recommended",
      workingTitle: recommendation.workingTitle,
      premise: recommendation.premise,
      narrativeHook: recommendation.narrativeHook,
      whyOverlooked: recommendation.whyOverlooked,
      strongestEvidence: recommendation.strongestEvidence,
      originalityAssessment: recommendation.originalityAssessment,
      unresolvedRisks: recommendation.unresolvedRisks,
      confidence: Math.round(recommendation.confidence),
      researchCompleteness: Math.round(recommendation.researchCompleteness),
      recommendedNextAction: recommendation.recommendedNextAction,
      scores: recommendation.scores,
      sourceIds: recommendation.sourceIds,
      followUpQueries: recommendation.followUpQueries,
      downgradeReason: recommendation.downgradeReason,
    }).returning();

    await logLegacyActivity(runId, "recommended", "Editorial recommendation saved", `${recommendation.workingTitle} was ranked for editorial review.`, { recommendationId: row.id, storyId });
    saved.push({ recommendationId: row.id, ...(storyId ? { storyId } : {}) });
  }
  return saved;
}

async function persistSources(storyId: string, sourceIds: string[], records: ArchiveRecord[]) {
  const db = getDb();
  const chosen = records.filter((record) => sourceIds.includes(record.id));
  if (!db || !chosen.length) return;
  await db.insert(sources).values(chosen.map((record) => ({
    storyId,
    url: record.url,
    title: record.title,
    publicationDate: record.date,
    sourceType: record.source,
    archiveIdentifier: record.id,
    excerpt: record.description,
    primarySource: true,
  }))).catch(() => undefined);
}

function editorialScore(recommendation: EditorialRecommendation) {
  const { narrativeTension, sourceStrength, originality, humanInterest, historicalConsequence, researchability } = recommendation.scores;
  return narrativeTension * 1.25 + sourceStrength + originality + humanInterest + historicalConsequence + researchability + recommendation.confidence + recommendation.researchCompleteness;
}

async function logActivity(cycle: CycleRow, kind: string, title: string, detail: string, metadata: Record<string, unknown>) {
  const db = getDb();
  if (!db) return;
  await db.insert(researchActivity).values({ cycleId: cycle.id, beatId: cycle.beatId, kind, title, detail, metadata }).catch(() => undefined);
}

async function logLegacyActivity(runId: string | undefined, kind: string, title: string, detail: string, metadata: Record<string, unknown>) {
  const db = getDb();
  if (!db) return;
  await db.insert(researchActivity).values({ runId, kind, title, detail, metadata }).catch(() => undefined);
}

void buildResearchDecisions;
void persistRecommendations;
