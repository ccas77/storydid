import type { ArchiveRecord } from "@/lib/types";

export function isRelevantFollowUp(title: string, hypothesis: string, record: ArchiveRecord) {
  const anchor = keywordSet(`${title} ${hypothesis}`);
  const target = keywordSet(`${record.title} ${record.description ?? ""}`);
  const overlap = [...anchor].filter((term) => target.has(term)).length;
  return overlap >= 2;
}

function keywordSet(value: string) {
  return new Set(value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 4)
    .filter((term) => !["image", "newspaper", "archive", "daily", "tribune", "record", "around"].includes(term)));
}
