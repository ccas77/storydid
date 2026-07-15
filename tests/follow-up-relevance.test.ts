import test from "node:test";
import assert from "node:assert/strict";
import { isRelevantFollowUp } from "../src/lib/research/follow-up";
import type { ArchiveRecord } from "../src/lib/types";

function archiveRecord(overrides: Partial<ArchiveRecord>): ArchiveRecord {
  return {
    id: "record-1",
    title: "The Macleod times and Macleod weekly news",
    url: "https://archive.org/details/MCU_1928052401",
    date: "1928",
    location: "Fort Macleod, Alberta",
    description: "Disaster in Mather, Pennsylvania mine: 159 still entombed; thirteen rescued alive.",
    source: "internet_archive",
    ...overrides,
  };
}

test("isRelevantFollowUp keeps independently relevant archive evidence", () => {
  assert.equal(isRelevantFollowUp(
    "The Mather mine disaster",
    "The Mather mine disaster in Pennsylvania around 1928",
    archiveRecord({}),
  ), true);
});

test("isRelevantFollowUp rejects one-word Internet Archive overlap", () => {
  assert.equal(isRelevantFollowUp(
    "The Mather mine disaster",
    "The Mather mine disaster in Pennsylvania around 1928",
    archiveRecord({
      id: "cia-readingroom-document",
      title: "CIA Reading Room congressional investigation testimony scandal",
      url: "https://archive.org/details/cia-readingroom-document",
      description: "A memorandum mentioning Mather in an unrelated intelligence oversight file.",
    }),
  ), false);
});
