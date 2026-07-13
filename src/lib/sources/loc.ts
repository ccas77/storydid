import type { ArchiveRecord } from "@/lib/types";

export async function searchLibraryOfCongress(query: string, limit = 15): Promise<ArchiveRecord[]> {
  const url = new URL("https://www.loc.gov/newspapers/");
  url.searchParams.set("fo", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("c", String(limit));
  const response = await fetch(url, { headers: { "User-Agent": "StoryMiner/0.1 research app" }, cache: "no-store" });
  if (!response.ok) throw new Error(`LOC search failed: ${response.status}`);
  const data = await response.json();
  return (data.results ?? []).map((item: Record<string, unknown>) => ({
    id: String(item.id ?? item.url),
    title: String(item.title ?? "Untitled record"),
    url: String(item.id ?? item.url),
    date: typeof item.date === "string" ? item.date : undefined,
    location: Array.isArray(item.location) ? item.location.join(", ") : undefined,
    description: Array.isArray(item.description) ? item.description.join(" ") : String(item.description ?? ""),
    source: "loc" as const
  }));
}
