import test from "node:test";
import assert from "node:assert/strict";
import type { StoryScript } from "../src/lib/types";
import { buildStoryScriptInput, generateStoryScriptUpdateForDossier, needsGeneratedStoryScript, type SourceRow, type StoryRow } from "../src/lib/research/story-generation";

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

test("needsGeneratedStoryScript selects researched dossiers without ready scripts", () => {
  const backfillable = {
    ...story,
    confidenceScore: 100,
    researchCompleteness: 100,
    scriptStatus: "none",
    storyText: [
      "Before dawn, the factory floor had already become a place of warnings. Witnesses later described a boiler system that had been treated as a nuisance rather than a threat, and the inquest turned that ignored danger into the center of the story.",
      "The explosion did not read like an unavoidable accident in the surviving evidence. Testimony tied the disaster to warnings, disputed inspections, and decisions made before anyone outside the building understood how close the danger had come.",
      "That is why the inquest matters. It put survivors, inspectors, and factory leadership into conflict over what had been known, who had acted, and whether the official account could survive the record left behind.",
      "The story is still bounded by the archive, but it has a narrative spine: warnings before the blast, testimony after it, and a public fight over responsibility for the deaths and damage that followed.",
    ].join("\n\n"),
    keyFacts: [
      "Witness testimony said ignored boiler warnings preceded the factory explosion and shaped the inquest.",
      "A second report documented disputed safety inspections after the disaster and identified accountability questions.",
      "The surviving accounts give the story a conflict between official safety claims and what witnesses said happened.",
    ],
    claimCitations: [
      { claim: "Witness testimony said ignored boiler warnings preceded the factory explosion and shaped the inquest.", sourceIds: ["loc:dayton-inquest"] },
      { claim: "A second report documented disputed safety inspections after the disaster and identified accountability questions.", sourceIds: ["source-row-2"] },
    ],
  } as unknown as StoryRow;

  assert.equal(needsGeneratedStoryScript(backfillable), true);
  assert.equal(needsGeneratedStoryScript({ ...backfillable, scriptStatus: "ready" } as StoryRow), false);
});
