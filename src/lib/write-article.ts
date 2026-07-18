import { searchLibraryOfCongress } from "@/lib/sources/loc";
import { searchInternetArchive } from "@/lib/sources/internet-archive";
import { generateStoryScript, wordCount } from "@/lib/research/story";
import type { ArchiveRecord, StoryScript } from "@/lib/types";

export type ArticleResult =
  | { ok: true; title: string; script: StoryScript; wordCount: number; sources: Array<{ id: string; title: string; url: string; date?: string | null }> }
  | { ok: false; reason: "no-sources" | "write-failed" };

function sourceKey(record: ArchiveRecord) {
  return `${record.source}:${record.id}`;
}

/**
 * The whole app: search public archives for a topic and, if there are usable sources,
 * write one finished ~2000-word article grounded in them. No pipeline, no scheduler.
 */
export async function researchAndWrite(topic: string): Promise<ArticleResult> {
  const [loc, ia] = await Promise.allSettled([
    searchLibraryOfCongress(topic, 8),
    searchInternetArchive(topic, 8),
  ]);
  const found = [
    ...(loc.status === "fulfilled" ? loc.value : []),
    ...(ia.status === "fulfilled" ? ia.value : []),
  ];
  const unique = Array.from(new Map(found.map((record) => [record.url, record])).values()).slice(0, 12);
  if (unique.length < 2) return { ok: false, reason: "no-sources" };

  try {
    const script = await generateStoryScript({
      workingTitle: topic,
      summary: `A researched article about: ${topic}`,
      sources: unique.map((record) => ({
        id: sourceKey(record),
        title: record.title,
        date: record.date,
        excerpt: record.description,
      })),
    });
    return {
      ok: true,
      title: topic,
      script,
      wordCount: wordCount(script),
      sources: unique.map((record) => ({ id: sourceKey(record), title: record.title, url: record.url, date: record.date ?? null })),
    };
  } catch {
    return { ok: false, reason: "write-failed" };
  }
}
