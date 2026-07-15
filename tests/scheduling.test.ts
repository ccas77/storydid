import test from "node:test";
import assert from "node:assert/strict";
import { selectNextBeat, type BeatScheduleState } from "../src/lib/research/beats";
import { compareClaimableCycles } from "../src/lib/research/cycle-claim";

const baseBeat = {
  description: "test beat",
  querySeeds: ["test"],
  cadenceWeight: 1,
};

test("selectNextBeat prefers a beat that has never been scheduled", () => {
  const now = new Date("2026-07-14T12:00:00Z");
  const beats: BeatScheduleState[] = [
    { ...baseBeat, id: "1", slug: "recent", name: "Recent", lastScheduledAt: new Date("2026-07-14T11:00:00Z") },
    { ...baseBeat, id: "2", slug: "new", name: "New", lastScheduledAt: null },
  ];

  assert.equal(selectNextBeat(beats, now)?.slug, "new");
});

test("selectNextBeat gives higher-weight beats more scheduling pressure over time", () => {
  const now = new Date("2026-07-14T12:00:00Z");
  const beats: BeatScheduleState[] = [
    { ...baseBeat, id: "1", slug: "low-weight", name: "Low Weight", cadenceWeight: 1, lastScheduledAt: new Date("2026-07-14T06:00:00Z") },
    { ...baseBeat, id: "2", slug: "high-weight", name: "High Weight", cadenceWeight: 3, lastScheduledAt: new Date("2026-07-14T09:00:00Z") },
  ];

  assert.equal(selectNextBeat(beats, now)?.slug, "high-weight");
});

test("selectNextBeat uses name as a stable tie breaker", () => {
  const now = new Date("2026-07-14T12:00:00Z");
  const beats: BeatScheduleState[] = [
    { ...baseBeat, id: "1", slug: "zulu", name: "Zulu", lastScheduledAt: new Date("2026-07-14T10:00:00Z") },
    { ...baseBeat, id: "2", slug: "alpha", name: "Alpha", lastScheduledAt: new Date("2026-07-14T10:00:00Z") },
  ];

  assert.equal(selectNextBeat(beats, now)?.slug, "alpha");
});

test("cycle claiming prioritizes queued user briefs over older scheduled work", () => {
  const cycles = [
    { id: "old-running", status: "running", createdAt: new Date("2026-07-14T09:00:00Z"), stageState: {} },
    { id: "old-queued", status: "queued", createdAt: new Date("2026-07-14T10:00:00Z"), stageState: {} },
    { id: "brief", status: "queued", createdAt: new Date("2026-07-14T11:00:00Z"), stageState: { source: "user_brief" } },
  ];

  assert.equal(cycles.sort(compareClaimableCycles)[0].id, "brief");
});

test("cycle claiming keeps a running user brief moving through its stages", () => {
  const cycles = [
    { id: "old-queued", status: "queued", createdAt: new Date("2026-07-14T10:00:00Z"), stageState: {} },
    { id: "brief", status: "running", createdAt: new Date("2026-07-14T11:00:00Z"), stageState: { source: "user_brief" } },
  ];

  assert.equal(cycles.sort(compareClaimableCycles)[0].id, "brief");
});
