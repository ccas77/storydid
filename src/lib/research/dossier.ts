import type { ClaimEvidence, ReadinessDecision } from "./readiness";

export type DossierDraftInput = {
  workingTitle: string;
  premise: string;
  narrativeHook: string;
  whyOverlooked: string;
  originalitySignals: string[];
  followUpQueries: string[];
  evidenceDepth: number;
  readiness: ReadinessDecision;
};

export type DossierDraft = {
  story: {
    workingTitle: string;
    category: string;
    summary: string;
    status: "ready";
    interestScore: number;
    sourceScore: number;
    competitionScore: number;
    confidenceScore: number;
    chronology: Array<{ date: string; event: string }>;
    keyFacts: string[];
    conflicts: string[];
    titles: string[];
    outline: Array<{ heading: string; notes: string }>;
    premise: string;
    narrativeHook: string;
    whyOverlooked: string;
    originalityAssessment: string;
    unresolvedRisks: string[];
    researchCompleteness: number;
    recommendedNextAction: string;
    claimCitations: Array<{ claim: string; sourceIds: string[] }>;
  };
  recommendation: {
    status: "dossier_ready";
    workingTitle: string;
    premise: string;
    narrativeHook: string;
    whyOverlooked: string;
    strongestEvidence: ClaimEvidence[];
    originalityAssessment: string;
    unresolvedRisks: string[];
    confidence: number;
    researchCompleteness: number;
    recommendedNextAction: "Develop";
    scores: {
      narrativeTension: number;
      sourceStrength: number;
      originality: number;
      humanInterest: number;
      historicalConsequence: number;
      researchability: number;
    };
    sourceIds: string[];
    followUpQueries: string[];
  };
};

export function prepareDossierDraft(input: DossierDraftInput): DossierDraft | undefined {
  if (!input.readiness.ready) return undefined;
  const sourceIds = Array.from(new Set(input.readiness.claimEvidence.flatMap((claim) => claim.sourceIds)));
  if (!sourceIds.length) return undefined;

  const originalityAssessment = input.originalitySignals.join(" ") || "Originality requires editorial review, but the lead passed automated source-depth checks.";
  const claimCitations = input.readiness.claimEvidence.map(({ claim, sourceIds: citedSourceIds }) => ({ claim, sourceIds: citedSourceIds }));
  const keyFacts = input.readiness.claimEvidence.map((claim) => claim.claim);

  return {
    story: {
      workingTitle: input.workingTitle,
      category: "Autonomous research dossier",
      summary: input.premise,
      status: "ready",
      interestScore: 70,
      sourceScore: Math.min(100, input.evidenceDepth),
      competitionScore: 70,
      confidenceScore: input.readiness.score,
      chronology: [],
      keyFacts,
      conflicts: input.readiness.risks,
      titles: [input.workingTitle],
      outline: [
        { heading: "Premise", notes: input.premise },
        { heading: "Evidence", notes: "Develop from the cited archive claims and source groups." },
        { heading: "Risks", notes: input.readiness.risks.length ? input.readiness.risks.join(" ") : "No blocking evidence risks at readiness gate." },
      ],
      premise: input.premise,
      narrativeHook: input.narrativeHook,
      whyOverlooked: input.whyOverlooked,
      originalityAssessment,
      unresolvedRisks: input.readiness.risks,
      researchCompleteness: input.readiness.score,
      recommendedNextAction: "Develop editorial treatment from the cited claims.",
      claimCitations,
    },
    recommendation: {
      status: "dossier_ready",
      workingTitle: input.workingTitle,
      premise: input.premise,
      narrativeHook: input.narrativeHook,
      whyOverlooked: input.whyOverlooked,
      strongestEvidence: input.readiness.claimEvidence,
      originalityAssessment,
      unresolvedRisks: input.readiness.risks,
      confidence: input.readiness.score,
      researchCompleteness: input.readiness.score,
      recommendedNextAction: "Develop",
      scores: { narrativeTension: 70, sourceStrength: input.evidenceDepth, originality: 70, humanInterest: 70, historicalConsequence: 60, researchability: input.readiness.score },
      sourceIds,
      followUpQueries: input.followUpQueries,
    },
  };
}
