import type { ArchiveRecord } from "@/lib/types";

export async function searchInternetArchive(query: string, limit = 15): Promise<ArchiveRecord[]> {
  const url = new URL("https://archive.org/advancedsearch.php");
  url.searchParams.set("q", `${query} AND mediatype:(texts)`);
  url.searchParams.set("fl[]", "identifier,title,date,description,coverage");
  url.searchParams.set("rows", String(limit));
  url.searchParams.set("output", "json");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Internet Archive search failed: ${response.status}`);
  const data = await response.json();
  return (data.response?.docs ?? []).map((item: Record<string, unknown>) => ({
    id: String(item.identifier),
    title: String(item.title ?? "Untitled item"),
    url: `https://archive.org/details/${item.identifier}`,
    date: item.date ? String(item.date) : undefined,
    location: item.coverage ? String(item.coverage) : undefined,
    description: Array.isArray(item.description) ? item.description.join(" ") : String(item.description ?? ""),
    source: "internet_archive" as const
  }));
}
