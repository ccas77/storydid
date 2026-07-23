import { searchLibraryOfCongress } from "@/lib/sources/loc";
import { searchInternetArchive } from "@/lib/sources/internet-archive";
import { generateStoryScript, verifyStoryScript, wordCount } from "@/lib/research/story";
import { AppError } from "@/lib/openai-call";
import type { ArchiveRecord, StoryScript } from "@/lib/types";

export type ArticleResult = {
  ok: true;
  title: string;
  script: StoryScript;
  wordCount: number;
  sources: Array<{ id: string; title: string; url: string; date?: string | null }>;
};

function sourceKey(record: ArchiveRecord) {
  return `${record.source}:${record.id}`;
}

/**
 * The whole app: search public archives for a topic (with optional alternate queries for
 * better coverage) and write one finished, fact-checked article grounded in what's found.
 * Throws AppError with a user-explainable kind on failure.
 */
export async function researchAndWrite(topic: string, altQueries: string[] = []): Promise<ArticleResult> {
  const queries = Array.from(new Set([topic, ...altQueries.map((query) => query.trim())].filter(Boolean))).slice(0, 3);
  const searches = await Promise.allSettled(queries.flatMap((query) => [
    searchLibraryOfCongress(query, 8),
    searchInternetArchive(query, 8),
  ]));
  const failures = searches.filter((result) => result.status === "rejected").length;
  const found = searches.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const unique = Array.from(new Map(found.map((record) => [record.url, record])).values()).slice(0, 16);

  if (unique.length < 2) {
    if (failures === searches.length && failures > 0) {
      throw new AppError("archives-down", "Both archive searches failed — the Library of Congress and Internet Archive may be unreachable from the server right now.");
    }
    throw new AppError("no-sources", `Only ${unique.length} usable archive records were found for "${topic}".`);
  }

  const validSourceIds = new Set(unique.map(sourceKey));
  const draft = await generateStoryScript({
    workingTitle: topic,
    summary: `A researched article about: ${topic}`,
    sources: unique.map((record) => ({
      id: sourceKey(record),
      title: record.title,
      date: record.date,
      excerpt: record.description,
    })),
  });
  // Fact-check / correct the draft before saving (best-effort; falls back to the draft).
  const script = await verifyStoryScript(draft, topic, validSourceIds);
  return {
    ok: true,
    title: topic,
    script,
    wordCount: wordCount(script),
    sources: unique.map((record) => ({ id: sourceKey(record), title: record.title, url: record.url, date: record.date ?? null })),
  };
}
