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
});

test("applyRecordBudget caps candidate work", () => {
  const items = [1, 2, 3, 4, 5];

  assert.deepEqual(applyRecordBudget(items, { maxRecords: 3 }), [1, 2, 3]);
});
