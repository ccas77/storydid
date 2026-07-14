import test from "node:test";
import assert from "node:assert/strict";
import { assessDossierReadiness } from "../src/lib/research/readiness";

test("assessDossierReadiness approves sufficiently sourced investigations", () => {
  const decision = assessDossierReadiness({
    workingTitle: "The factory inquest that changed the town",
    premise: "A factory explosion inquest exposed preventable safety failures.",
    evidenceDepth: 86,
    sourceIndependence: [
      { group: "library_of_congress", sourceIds: ["loc:1", "loc:2"] },
      { group: "internet_archive", sourceIds: ["internet_archive:3"] },
    ],
    researchQuestions: ["What happened?", "Who was harmed?", "What corroborates it?"],
  });

  assert.equal(decision.ready, true);
  assert.ok(decision.claimEvidence.length >= 2);
});

test("assessDossierReadiness blocks weak source independence", () => {
  const decision = assessDossierReadiness({
    workingTitle: "One-source mystery",
    premise: "A thin lead based on one source.",
    evidenceDepth: 90,
    sourceIndependence: [{ group: "library_of_congress", sourceIds: ["loc:1"] }],
    researchQuestions: ["What happened?", "Who was harmed?", "What corroborates it?"],
  });

  assert.equal(decision.ready, false);
  assert.match(decision.risks.join(" "), /Fewer than two/);
});
