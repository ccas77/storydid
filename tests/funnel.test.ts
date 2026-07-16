import test from "node:test";
import assert from "node:assert/strict";
import { applyRecordBudget, buildCandidateFunnel, rejectRecord } from "../src/lib/research/funnel";
import type { ArchiveRecord } from "../src/lib/types";

function record(overrides: Partial<ArchiveRecord>): ArchiveRecord {
  return {
    id: "record-1",
    title: "Factory explosion inquest testimony",
    url: "https://example.test/record-1",
    date: "1912",
    location: "Ohio",
    description: "Inquest testimony after a factory explosion raised questions about safety failures.",
    source: "loc",
    ...overrides,
  };
}

test("rejectRecord rejects weak archive records", () => {
  const decision = rejectRecord(record({ title: "Note", description: undefined, date: undefined }));

  assert.equal(decision?.code, "weak_record");
});

test("rejectRecord rejects institutional minutiae", () => {
  const decision = rejectRecord(record({
    title: "Annual report and committee minutes",
    description: "Routine board minutes and budget estimate for the institution.",
  }));

  assert.equal(decision?.code, "institutional_minutiae");
});

test("buildCandidateFunnel marks duplicate records with a structured reason", () => {
  const decisions = buildCandidateFunnel([
    record({ id: "a", url: "https://example.test/a" }),
    record({ id: "b", url: "https://example.test/b" }),
  ]);

  assert.equal(decisions[0].status, "active");
  assert.equal(decisions[1].status, "duplicate");
  assert.equal(decisions[1].rejectionCode, "duplicate");
  assert.equal(decisions[1].duplicateOf, "a");
  assert.deepEqual(decisions[0].evidenceSourceIds.sort(), ["loc:a", "loc:b"].sort());
});

test("buildCandidateFunnel merges related cross-archive evidence into the same story", () => {
  const decisions = buildCandidateFunnel([
    record({
      id: "91149767",
      title: "The Mather mine disaster",
      url: "https://www.loc.gov/item/91149767/",
      location: "Mather, Pennsylvania",
      description: "Booklet about the Mather mine disaster, casualties, and official reports.",
      source: "loc",
    }),
    record({
      id: "MCU_1928052401",
      title: "The Macleod times and Macleod weekly news (1928-05-24)",
      url: "https://archive.org/details/MCU_1928052401",
      location: "Fort Macleod, Alberta",
      description: "Disaster in Mather, Pennsylvania mine: 159 still entombed; thirteen rescued alive.",
      source: "internet_archive",
    }),
  ]);

  assert.equal(decisions[0].status, "active");
  assert.ok(decisions[0].evidenceSourceIds.includes("loc:91149767"));
  assert.ok(decisions[0].evidenceSourceIds.includes("internet_archive:MCU_1928052401"));
});

test("buildCandidateFunnel rejects records unrelated to a research brief", () => {
  const decisions = buildCandidateFunnel([
    record({
      id: "cia-article",
      title: "CIA Reading Room congressional investigation testimony scandal",
      url: "https://archive.org/details/cia-readingroom-document",
      description: "Investigation testimony about congressional intelligence oversight, accusations, disputed evidence, and institutional scandal.",
      source: "internet_archive",
    }),
  ], undefined, "Mather mine disaster testimony investigation 1928 independent newspaper report");

  assert.equal(decisions[0].status, "rejected");
  assert.equal(decisions[0].rejectionReason, "The record does not match enough distinctive terms from the beat or research brief.");
});

test("buildCandidateFunnel requires strong research brief relevance before investigation", () => {
  const decisions = buildCandidateFunnel([
    record({
      id: "cia-retirement-dinner",
      title: "CIA Reading Room arrangements for a retirement dinner",
      url: "https://archive.org/details/cia-readingroom-document",
      date: "1988",
      location: "Washington, D.C.",
      description: "Administrative correspondence about a retirement dinner and intelligence office arrangements.",
      source: "internet_archive",
    }),
    record({
      id: "mather-mine-disaster",
      title: "The Mather mine disaster",
      url: "https://www.loc.gov/item/91149767/",
      date: "1928",
      location: "Mather, Pennsylvania",
      description: "Report on the Mather mine disaster and rescue work in Pennsylvania.",
      source: "loc",
    }),
  ], undefined, "Mather mine disaster Mather Pennsylvania 1928 independent newspaper report");

  assert.equal(decisions[0].status, "rejected");
  assert.equal(decisions[1].status, "active");
});

test("applyRecordBudget caps candidate work", () => {
  const items = [1, 2, 3, 4, 5];

  assert.deepEqual(applyRecordBudget(items, { maxRecords: 3 }), [1, 2, 3]);
});
