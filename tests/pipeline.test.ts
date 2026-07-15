import test from "node:test";
import assert from "node:assert/strict";
import type { ArchiveRecord } from "../src/lib/types";
import { buildCandidateFunnel } from "../src/lib/research/funnel";
import { evidenceDepthScore, groupSourceIndependence, originalitySignals, researchQuestionsFor, shouldDowngradeInvestigation } from "../src/lib/research/investigation";
import { makeBriefSeeds } from "../src/lib/research/queries";
import { assessDossierReadiness } from "../src/lib/research/readiness";
import { prepareDossierDraft } from "../src/lib/research/dossier";

test("pipeline can advance a research brief into a cited dossier draft", () => {
  const seeds = makeBriefSeeds("factory explosion inquest testimony in Ohio");
  assert.ok(seeds.some((seed) => seed.includes("factory explosion")));
  assert.ok(seeds.some((seed) => seed.split(" ").length <= 3));

  const records: ArchiveRecord[] = [
    {
      id: "dayton-explosion-inquest",
      source: "loc",
      title: "Factory explosion inquest testimony names preventable boiler failures",
      url: "https://www.loc.gov/item/dayton-explosion-inquest/",
      date: "1912",
      location: "Dayton, Ohio",
      description: "Newspaper testimony from an inquest into a factory explosion, survivor accounts, and disputed safety inspections.",
    },
    {
      id: "factorysafetyreport1912",
      source: "internet_archive",
      title: "Factory safety investigation after Dayton explosion",
      url: "https://archive.org/details/factorysafetyreport1912",
      date: "1912",
      location: "Ohio",
      description: "Published investigation report documenting testimony, boiler defects, and public accountability after the disaster.",
    },
  ];

  const candidates = buildCandidateFunnel(records);
  assert.equal(candidates.every((candidate) => candidate.status === "active"), true);

  const candidate = candidates[0];
  const evidenceSourceIds = records.map((record) => `${record.source}:${record.id}`);
  const investigation = {
    externalId: candidate.record.id,
    title: candidate.record.title,
    hypothesis: candidate.hypothesis,
    evidenceSourceIds,
    scores: candidate.scores,
  };
  const downgradeReason = shouldDowngradeInvestigation(investigation);
  assert.equal(downgradeReason, undefined);

  const readiness = assessDossierReadiness({
    workingTitle: "The Factory Inquest That Named the Boiler",
    premise: "A 1912 Dayton factory explosion inquest exposed preventable boiler failures and disputed safety inspections.",
    evidenceDepth: evidenceDepthScore(investigation),
    sourceIndependence: groupSourceIndependence(evidenceSourceIds),
    researchQuestions: researchQuestionsFor(investigation),
  });
  assert.equal(readiness.ready, true);

  const dossier = prepareDossierDraft({
    workingTitle: "The Factory Inquest That Named the Boiler",
    premise: "A 1912 Dayton factory explosion inquest exposed preventable boiler failures and disputed safety inspections.",
    narrativeHook: "Who ignored the boiler warnings before the blast?",
    whyOverlooked: "The lead sits in local newspaper testimony and a technical investigation rather than in a familiar national scandal.",
    originalitySignals: originalitySignals(investigation),
    followUpQueries: seeds,
    evidenceDepth: evidenceDepthScore(investigation),
    readiness,
  });

  assert.ok(dossier);
  assert.equal(dossier.story.status, "ready");
  assert.equal(dossier.recommendation.status, "dossier_ready");
  assert.ok(dossier.story.claimCitations.every((claim) => claim.sourceIds.length >= 2));
  assert.ok(dossier.recommendation.strongestEvidence.every((claim) => claim.sourceIds.includes("loc:dayton-explosion-inquest")));
});
