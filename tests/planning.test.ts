import test from "node:test";
import assert from "node:assert/strict";
import { buildDeterministicInvestigationPlans } from "../src/lib/research/openai";

test("deterministic investigation plans keep deep research moving without model credentials", () => {
  const [plan] = buildDeterministicInvestigationPlans([{
    externalId: "loc:boiler-inquest",
    title: "Factory explosion inquest testimony names boiler defects",
    hypothesis: "Factory explosion inquest testimony in Dayton around 1912",
    evidenceSourceIds: ["loc:boiler-inquest"],
    scores: { narrativeSignal: 72, sourceSignal: 80, specificity: 88 },
  }]);

  assert.equal(plan.candidateExternalId, "loc:boiler-inquest");
  assert.ok(plan.researchQuestions.length >= 3);
  assert.ok(plan.followUpQueries.some((query) => query.includes("testimony")));
  assert.ok(plan.sourceIndependence.some((group) => group.group === "library_of_congress"));
  assert.equal(plan.downgradeReason, undefined);
});
