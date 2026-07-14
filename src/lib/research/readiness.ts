export type ClaimEvidence = {
  claim: string;
  sourceIds: string[];
  note: string;
};

export type ReadinessInput = {
  premise: string;
  workingTitle: string;
  evidenceDepth: number;
  sourceIndependence: Array<{ group: string; sourceIds: string[] }>;
  researchQuestions: string[];
  downgradeReason?: string | null;
};

export type ReadinessDecision = {
  ready: boolean;
  score: number;
  risks: string[];
  claimEvidence: ClaimEvidence[];
};

export function assessDossierReadiness(input: ReadinessInput): ReadinessDecision {
  const independentGroups = input.sourceIndependence.filter((group) => group.sourceIds.length > 0);
  const risks = [
    input.downgradeReason ? input.downgradeReason : undefined,
    input.evidenceDepth < 72 ? "Evidence depth is below the dossier threshold." : undefined,
    independentGroups.length < 2 ? "Fewer than two independent source groups support the premise." : undefined,
    input.researchQuestions.length < 3 ? "The investigation does not yet have enough answered research questions." : undefined,
  ].filter((risk): risk is string => Boolean(risk));
  const score = Math.min(100, Math.round(input.evidenceDepth * 0.65 + Math.min(independentGroups.length, 3) * 12 + Math.min(input.researchQuestions.length, 4) * 4));
  return {
    ready: risks.length === 0 && score >= 72,
    score,
    risks,
    claimEvidence: buildClaimEvidence(input),
  };
}

function buildClaimEvidence(input: ReadinessInput): ClaimEvidence[] {
  const citedSources = input.sourceIndependence.flatMap((group) => group.sourceIds).slice(0, 6);
  return [
    {
      claim: input.premise,
      sourceIds: citedSources,
      note: "Core premise is supported by the collected archive source groups.",
    },
    {
      claim: `${input.workingTitle} has sufficient source depth for editorial development.`,
      sourceIds: citedSources,
      note: "Readiness is based on evidence depth, source independence, and remaining research risks.",
    },
  ].filter((claim) => claim.sourceIds.length > 0);
}
