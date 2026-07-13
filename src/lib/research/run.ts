import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { archiveRecords, editorialRecommendations, researchActivity, researchRuns, sources, stories, storyClusters } from "@/db/schema";
import { searchInternetArchive } from "@/lib/sources/internet-archive";
import { searchLibraryOfCongress } from "@/lib/sources/loc";
import type { ArchiveRecord, EditorialRecommendation } from "@/lib/types";
import { makeDailyQueries } from "./queries";
import { buildResearchDecisions } from "./openai";

const DOSSIER_CONFIDENCE_THRESHOLD = 70;
const DOSSIER_COMPLETENESS_THRESHOLD = 72;

export async function runResearch() {
  const db = getDb();
  const queries = makeDailyQueries();
  const runRows = db ? await db.insert(researchRuns).values({ status: "running", querySet: queries }).returning() : [];
  const runId = runRows[0]?.id;

  try {
    await logActivity(runId, "search", "Scheduled discovery started", `Searching ${queries.length} rotating archive queries.`, { queries });
    const initialRecords = await discoverRecords(queries);
    const uniqueInitial = dedupeRecords(initialRecords);
    await persistArchiveRecords(runId, uniqueInitial);
    await logActivity(runId, "search", "Archive discovery completed", `Found ${uniqueInitial.length} unique raw archive records.`, { recordsFound: uniqueInitial.length });

    const initialDecisions = await buildResearchDecisions(uniqueInitial);
    await logDecisionActivity(runId, initialDecisions.rejected, "rejected");
    await logDecisionActivity(runId, initialDecisions.merged, "merged");

    const followUpQueries = Array.from(new Set(initialDecisions.recommendations
      .filter((recommendation) => recommendation.confidence >= 45 && recommendation.researchCompleteness < DOSSIER_COMPLETENESS_THRESHOLD)
      .flatMap((recommendation) => recommendation.followUpQueries)
      .filter(Boolean)
      .slice(0, 8)));

    let followUpRecords: ArchiveRecord[] = [];
    if (followUpQueries.length) {
      await logActivity(runId, "follow_up", "Agent issued follow-up searches", `The research agent requested ${followUpQueries.length} follow-up searches for promising leads.`, { followUpQueries });
      followUpRecords = await discoverRecords(followUpQueries, 8);
      await persistArchiveRecords(runId, followUpRecords);
      await logActivity(runId, "search", "Follow-up discovery completed", `Follow-up searches found ${dedupeRecords(followUpRecords).length} additional records.`, { recordsFound: dedupeRecords(followUpRecords).length });
    }

    const allRecords = dedupeRecords([...uniqueInitial, ...followUpRecords]);
    const finalDecisions = followUpRecords.length ? await buildResearchDecisions(allRecords) : initialDecisions;
    const saved = db ? await persistRecommendations(runId, finalDecisions.recommendations, allRecords) : [];

    if (db && runId) {
      await db.update(researchRuns).set({
        status: "completed",
        candidatesFound: allRecords.length,
        storiesSaved: saved.filter((item) => item.storyId).length,
        completedAt: new Date(),
      }).where(eq(researchRuns.id, runId));
    }

    await logActivity(runId, "complete", "Autonomous research cycle completed", `Saved ${saved.length} editorial recommendations and ${saved.filter((item) => item.storyId).length} finished dossiers.`, {
      recommendationsSaved: saved.length,
      dossiersSaved: saved.filter((item) => item.storyId).length,
    });

    return { ok: true, queries, followUpQueries, recordsFound: allRecords.length, recommendations: saved.length, dossiers: saved.filter((item) => item.storyId).length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logActivity(runId, "error", "Research cycle failed", message, {});
    if (db && runId) await db.update(researchRuns).set({ status: "failed", error: message, completedAt: new Date() }).where(eq(researchRuns.id, runId));
    throw error;
  }
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

async function persistArchiveRecords(runId: string | undefined, records: ArchiveRecord[]) {
  const db = getDb();
  if (!db || !records.length) return;
  await db.insert(archiveRecords).values(records.map((record) => ({
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
      await logActivity(runId, "dossier", "Finished dossier generated", `${recommendation.workingTitle} met the confidence and evidence threshold.`, { storyId });
    } else if (recommendation.downgradeReason) {
      await logActivity(runId, "downgraded", "Investigation downgraded", `${recommendation.workingTitle}: ${recommendation.downgradeReason}`, { mergeKey: recommendation.mergeKey });
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

    await logActivity(runId, "recommended", "Editorial recommendation saved", `${recommendation.workingTitle} was ranked for editorial review.`, { recommendationId: row.id, storyId });
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

async function logDecisionActivity(runId: string | undefined, decisions: Array<{ title: string; reason: string; sourceIds: string[] }>, kind: "rejected" | "merged") {
  for (const decision of decisions.slice(0, 12)) {
    await logActivity(runId, kind, kind === "rejected" ? "Candidate rejected" : "Records merged", `${decision.title}: ${decision.reason}`, { sourceIds: decision.sourceIds });
  }
}

async function logActivity(runId: string | undefined, kind: string, title: string, detail: string, metadata: Record<string, unknown>) {
  const db = getDb();
  if (!db) return;
  await db.insert(researchActivity).values({ runId, kind, title, detail, metadata }).catch(() => undefined);
}
