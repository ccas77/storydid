import test from "node:test";
import assert from "node:assert/strict";
import { evidenceDepthScore, groupSourceIndependence, researchQuestionsFor, shouldDowngradeInvestigation } from "../src/lib/research/investigation";

const strongCandidate = {
  externalId: "loc:strong",
  title: "Factory explosion inquest testimony",
  hypothesis: "Factory explosion inquest testimony in Ohio around 1912",
  evidenceSourceIds: ["loc:1", "loc:2", "internet_archive:3"],
  scores: { narrativeSignal: 72, sourceSignal: 80, specificity: 88 },
};

test("evidenceDepthScore increases with source count and source strength", () => {
  const weak = evidenceDepthScore({ evidenceSourceIds: ["loc:1"], scores: { sourceSignal: 20, specificity: 20 } });
  const strong = evidenceDepthScore(strongCandidate);

  assert.ok(strong > weak);
});

test("groupSourceIndependence groups source ids by archive base", () => {
  assert.deepEqual(groupSourceIndependence(["loc:1", "loc:2", "internet_archive:3"]), [
    { group: "library_of_congress", sourceIds: ["loc:1", "loc:2"] },
    { group: "internet_archive", sourceIds: ["internet_archive:3"] },
  ]);
});

test("shouldDowngradeInvestigation downgrades weak evidence", () => {
  const reason = shouldDowngradeInvestigation({
    externalId: "weak",
    title: "Sparse note",
    hypothesis: "Sparse note",
    evidenceSourceIds: [],
    scores: { narrativeSignal: 80, sourceSignal: 10, specificity: 10 },
  });

  assert.match(reason ?? "", /Evidence depth/);
});

test("shouldDowngradeInvestigation allows sourced disaster leads", () => {
  const reason = shouldDowngradeInvestigation({
    externalId: "mather",
    title: "The Mather mine disaster",
    hypothesis: "The Mather mine disaster in Mather, Pennsylvania around 1928",
    evidenceSourceIds: ["loc:91149767", "internet_archive:MCU_1928052401", "internet_archive:chinamail19280523"],
    scores: { narrativeSignal: 30, sourceSignal: 90, specificity: 100 },
  });

  assert.equal(reason, undefined);
});

test("researchQuestionsFor creates controlled investigation questions", () => {
  const questions = researchQuestionsFor(strongCandidate);

  assert.ok(questions.some((question) => question.includes("independent sources")));
});
