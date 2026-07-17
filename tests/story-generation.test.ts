import test from "node:test";
import assert from "node:assert/strict";
import type { StoryScript } from "../src/lib/types";
import { buildStoryScriptInput, generateStoryScriptUpdateForDossier, type SourceRow, type StoryRow } from "../src/lib/research/story-generation";

const story = {
  id: "story-1",
  workingTitle: "The Factory Inquest That Named the Boiler",
  category: "Autonomous research dossier",
  summary: "A factory explosion inquest exposed ignored boiler warnings.",
  storyText: "A finished dossier narrative with claims and cautions.",
  eventDate: "1912",
  location: "Dayton, Ohio",
  premise: "Witness testimony and inspection records raised accountability questions after a factory explosion.",
  narrativeHook: "Who ignored the boiler warnings before the blast?",
  chronology: [{ date: "1912", event: "Witnesses testified about the boiler warnings." }],
  keyFacts: ["Witness testimony said warnings preceded the factory explosion."],
  conflicts: ["The record still needs careful handling."],
  unresolvedRisks: ["Some allegations are from newspaper accounts."],
  outline: [{ heading: "Opening", notes: "Start with the warning before the blast." }],
  claimCitations: [{ claim: "Witness testimony said ignored boiler warnings preceded the factory explosion.", sourceIds: ["loc:dayton-inquest"] }],
} as unknown as StoryRow;

const refs = [
  {
    id: "source-row-1",
    archiveIdentifier: "loc:dayton-inquest",
    title: "Factory explosion inquest testimony",
    publicationDate: "1912",
    excerpt: "Witnesses described ignored boiler warnings before the explosion.",
  },
  {
    id: "source-row-2",
    archiveIdentifier: null,
    title: "Factory safety investigation",
    publicationDate: "1912",
    excerpt: "The report documented disputed inspections after the disaster.",
  },
] as unknown as SourceRow[];

test("buildStoryScriptInput preserves dossier context and saved source identifiers", () => {
  const input = buildStoryScriptInput(story, refs);

  assert.equal(input.workingTitle, "The Factory Inquest That Named the Boiler");
  assert.equal(input.sources[0].id, "loc:dayton-inquest");
  assert.equal(input.sources[1].id, "source-row-2");
  assert.deepEqual(input.claimCitations?.[0].sourceIds, ["loc:dayton-inquest"]);
});

test("generateStoryScriptUpdateForDossier returns a persisted ready-script update", async () => {
  const generated: StoryScript = {
    hook: "The first warning came before the blast, which made the later inquest impossible to treat as routine.",
    segments: [
      {
        heading: "Opening",
        narration: "The story begins with testimony about ignored boiler warnings before the factory explosion. That evidence gives the inquest a clear narrative question about who understood the danger and who had the power to act before disaster struck.",
        sourceIds: ["loc:dayton-inquest"],
      },
      {
        heading: "Accountability",
        narration: "The safety investigation adds a second layer by documenting disputed inspections after the disaster. Read together, the sources turn the incident into a conflict over accountability rather than a bare accident summary.",
        sourceIds: ["source-row-2"],
      },
    ],
    closingLine: "The publishable story is the warning before the blast and the public fight over what that warning meant.",
    disclaimer: "This script stays within the saved dossier and source records; newspaper allegations should be labeled as allegations.",
  };
  const fixedDate = new Date("2026-07-17T12:00:00Z");
  const update = await generateStoryScriptUpdateForDossier(story, refs, async (input) => {
    assert.equal(input.sources.length, 2);
    return generated;
  }, () => fixedDate);

  assert.equal(update.scriptStatus, "ready");
  assert.equal(update.scriptHook, generated.hook);
  assert.deepEqual(update.scriptSegments, generated.segments);
  assert.equal(update.scriptGeneratedAt, fixedDate);
  assert.ok(update.scriptWordCount > 50);
});

test("generateStoryScriptUpdateForDossier refuses dossiers without saved sources", async () => {
  await assert.rejects(
    () => generateStoryScriptUpdateForDossier(story, [], async () => {
      throw new Error("should not run");
    }),
    /requires saved cited sources/,
  );
});
