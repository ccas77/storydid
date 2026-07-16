import type { ArchiveRecord } from "@/lib/types";

export function isRelevantFollowUp(title: string, hypothesis: string, record: ArchiveRecord) {
  const anchor = keywordSet(`${title} ${hypothesis}`);
  const target = keywordSet(`${record.title} ${record.description ?? ""}`);
  const overlap = [...anchor].filter((term) => target.has(term)).length;
  const requiredOverlap = anchor.size >= 5 ? 3 : 2;
  return overlap >= requiredOverlap;
}

function keywordSet(value: string) {
  return new Set(value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 4 || /^(18|19|20)\d{2}$/.test(term))
    .filter((term) => !["image", "newspaper", "archive", "daily", "tribune", "record", "around"].includes(term)));
}
