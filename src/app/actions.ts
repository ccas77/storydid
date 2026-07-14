"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { archiveRecords, editorialRecommendations, researchActivity, researchSettings, sources, stories } from "@/db/schema";

export async function autopilotAction(formData: FormData) {
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const db = getDb();
  if (!db) return;

  await db.insert(researchSettings).values({
    key: "autopilot",
    value: { enabled },
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: researchSettings.key,
    set: { value: { enabled }, updatedAt: new Date() },
  });
  await db.insert(researchActivity).values({
    kind: "control",
    title: enabled ? "Autopilot resumed" : "Autopilot paused",
    detail: enabled ? "Scheduled research cycles can advance again." : "Scheduled research cycles will not start while autopilot is paused.",
    metadata: { enabled },
  }).catch(() => undefined);

  revalidatePath("/");
  revalidatePath("/activity");
}

export async function recommendationAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const db = getDb();
  if (!db || !id) return;

  const [recommendation] = await db.select().from(editorialRecommendations).where(eq(editorialRecommendations.id, id)).limit(1);
  if (!recommendation) return;

  if (action === "dismiss") {
    await db.update(editorialRecommendations).set({ status: "dismissed", updatedAt: new Date() }).where(eq(editorialRecommendations.id, id));
    await logUserAction(id, "Dismissed", "The recommendation was removed from the editorial shortlist.");
  }

  if (action === "improve-angle") {
    await db.update(editorialRecommendations).set({ status: "angle_requested", updatedAt: new Date() }).where(eq(editorialRecommendations.id, id));
    await logUserAction(id, "Angle improvement requested", "The editor asked the agent to revisit the framing before development.");
  }

  if (action === "investigate-further") {
    await db.update(editorialRecommendations).set({ status: "investigate_further", updatedAt: new Date() }).where(eq(editorialRecommendations.id, id));
    await logUserAction(id, "Further investigation requested", "The editor asked the agent to gather more evidence before approving development.");
  }

  if (action === "develop") {
    let storyId = recommendation.storyId ?? undefined;
    if (!storyId) {
      const [story] = await db.insert(stories).values({
        workingTitle: recommendation.workingTitle,
        category: "Editorial development",
        summary: recommendation.premise,
        status: "ready",
        interestScore: scoreValue(recommendation.scores, "humanInterest"),
        sourceScore: scoreValue(recommendation.scores, "sourceStrength"),
        competitionScore: scoreValue(recommendation.scores, "originality"),
        confidenceScore: recommendation.confidence,
        keyFacts: evidenceClaims(recommendation.strongestEvidence),
        conflicts: recommendation.unresolvedRisks ?? [],
        titles: [recommendation.workingTitle],
        outline: [{ heading: "Editorial premise", notes: recommendation.narrativeHook }],
        premise: recommendation.premise,
        narrativeHook: recommendation.narrativeHook,
        whyOverlooked: recommendation.whyOverlooked,
        originalityAssessment: recommendation.originalityAssessment,
        unresolvedRisks: recommendation.unresolvedRisks ?? [],
        researchCompleteness: recommendation.researchCompleteness,
        recommendedNextAction: recommendation.recommendedNextAction,
        claimCitations: claimCitations(recommendation.strongestEvidence),
      }).returning();
      storyId = story.id;
      await attachSources(story.id, recommendation.sourceIds ?? []);
    }
    await db.update(editorialRecommendations).set({ status: "developing", storyId, updatedAt: new Date() }).where(eq(editorialRecommendations.id, id));
    await logUserAction(id, "Development approved", "The recommendation was promoted into a finished dossier workspace.");
  }

  revalidatePath("/");
  revalidatePath("/activity");
}

async function attachSources(storyId: string, sourceIds: string[]) {
  const db = getDb();
  if (!db || !sourceIds.length) return;
  const records = await db.select().from(archiveRecords).where(inArray(archiveRecords.externalId, sourceIds));
  if (!records.length) return;
  await db.insert(sources).values(records.map((record) => ({
    storyId,
    url: record.url,
    title: record.title,
    publicationDate: record.recordDate,
    sourceType: record.source,
    archiveIdentifier: record.externalId,
    excerpt: record.description,
    primarySource: true,
  }))).catch(() => undefined);
}

async function logUserAction(recommendationId: string, title: string, detail: string) {
  const db = getDb();
  if (!db) return;
  await db.insert(researchActivity).values({ recommendationId, kind: "editorial_action", title, detail }).catch(() => undefined);
}

function scoreValue(scores: unknown, key: string) {
  if (!scores || typeof scores !== "object") return 0;
  const value = (scores as Record<string, unknown>)[key];
  return typeof value === "number" ? Math.round(value) : 0;
}

function evidenceClaims(value: unknown) {
  return Array.isArray(value) ? value.map((item) => typeof item?.claim === "string" ? item.claim : "").filter(Boolean) : [];
}

function claimCitations(value: unknown) {
  return Array.isArray(value) ? value.map((item) => ({
    claim: typeof item?.claim === "string" ? item.claim : "",
    sourceIds: Array.isArray(item?.sourceIds) ? item.sourceIds.filter((sourceId: unknown) => typeof sourceId === "string") : [],
  })).filter((item) => item.claim) : [];
}
