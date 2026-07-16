import test from "node:test";
import assert from "node:assert/strict";
import { buildStoryNarrative } from "../src/lib/research/story-narrative";

test("buildStoryNarrative leads with readable story paragraphs before evidence links", () => {
  const paragraphs = buildStoryNarrative({
    workingTitle: "The Factory Inquest That Named the Boiler",
    summary: "A 1912 Dayton factory explosion inquest exposed preventable boiler failures.",
    premise: "A 1912 Dayton factory explosion inquest exposed preventable boiler failures and disputed safety inspections.",
    narrativeHook: "Who ignored the boiler warnings before the blast?",
    whyOverlooked: "The lead sits in local testimony rather than a familiar national scandal.",
    originalityAssessment: "The surviving record combines survivor testimony with a technical investigation.",
    claimCitations: [
      { claim: "The inquest named boiler failures as central evidence.", sourceIds: ["loc:dayton-explosion-inquest"] },
      { claim: "A later safety report documented disputed inspections.", sourceIds: ["internet_archive:factorysafetyreport1912"] },
    ],
  });

  assert.ok(paragraphs.length >= 4);
  assert.match(paragraphs[0], /Who ignored the boiler warnings/);
  assert.match(paragraphs[1], /The evidence trail starts/);
  assert.match(paragraphs[1], /\[C1\]/);
  assert.doesNotMatch(paragraphs.join("\n"), /https?:\/\//);
});
