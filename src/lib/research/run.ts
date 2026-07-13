import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchRuns, sources, stories } from "@/db/schema";
import { searchInternetArchive } from "@/lib/sources/internet-archive";
import { searchLibraryOfCongress } from "@/lib/sources/loc";
import { makeDailyQueries } from "./queries";
import { buildDossiers } from "./openai";

export async function runResearch() {
  const db = getDb();
  const queries = makeDailyQueries();
  const runRows = db ? await db.insert(researchRuns).values({ status: "running", querySet: queries }).returning() : [];
  const runId = runRows[0]?.id;
  try {
    const batches = await Promise.allSettled(queries.flatMap(q => [searchLibraryOfCongress(q, 12), searchInternetArchive(q, 12)]));
    const records = batches.flatMap(r => r.status === "fulfilled" ? r.value : []);
    const unique = Array.from(new Map(records.map(r => [r.url, r])).values());
    const dossiers = await buildDossiers(unique);
    if (db) {
      for (const dossier of dossiers) {
        const [story] = await db.insert(stories).values({
          workingTitle: dossier.workingTitle, category: dossier.category, summary: dossier.summary, eventDate: dossier.eventDate,
          location: dossier.location, status: "ready", interestScore: Math.round(dossier.scores.interest), sourceScore: Math.round(dossier.scores.sources),
          competitionScore: Math.round(dossier.scores.competition), confidenceScore: Math.round(dossier.scores.confidence), chronology: dossier.chronology,
          keyFacts: dossier.keyFacts, conflicts: dossier.conflicts, titles: dossier.titles, outline: dossier.outline
        }).returning();
        const chosen = unique.filter(r => dossier.sourceIds.includes(r.id));
        if (chosen.length) await db.insert(sources).values(chosen.map(r => ({ storyId: story.id, url: r.url, title: r.title, publicationDate: r.date, sourceType: r.source, archiveIdentifier: r.id, excerpt: r.description, primarySource: true })));
      }
      if (runId) await db.update(researchRuns).set({ status: "completed", candidatesFound: unique.length, storiesSaved: dossiers.length, completedAt: new Date() }).where(eq(researchRuns.id, runId));
    }
    return { ok: true, queries, recordsFound: unique.length, dossiers };
  } catch (error) {
    if (db && runId) await db.update(researchRuns).set({ status: "failed", error: error instanceof Error ? error.message : String(error), completedAt: new Date() }).where(eq(researchRuns.id, runId));
    throw error;
  }
}
