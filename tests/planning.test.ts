import test from "node:test";
import assert from "node:assert/strict";
import { buildDeterministicInvestigationPlans, plansOrDeterministic } from "../src/lib/research/openai";

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

test("empty model investigation output falls back to deterministic plans", () => {
  const plans = plansOrDeterministic([], [{
    externalId: "loc:mather-mine-disaster",
    title: "The Mather mine disaster",
    hypothesis: "Mine disaster testimony in Mather, Pennsylvania around 1928",
    evidenceSourceIds: ["loc:mather-mine-disaster"],
    scores: { narrativeSignal: 78, sourceSignal: 80, specificity: 84 },
  }]);

  assert.equal(plans.length, 1);
  assert.equal(plans[0].candidateExternalId, "loc:mather-mine-disaster");
});
