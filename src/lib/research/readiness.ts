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
  const sourceGroups = input.sourceIndependence.filter((group) => group.sourceIds.length > 0).map((group) => group.group.replaceAll("_", " "));
  const firstQuestion = input.researchQuestions[0] ?? `What happened in ${input.workingTitle}?`;
  const secondQuestion = input.researchQuestions[1] ?? "Who was affected, blamed, accused, or vindicated?";
  return [
    {
      claim: input.premise,
      sourceIds: citedSources,
      note: "Core premise is supported by the collected archive source groups.",
    },
    {
      claim: `${input.workingTitle} has a source-backed conflict over accountability: ${firstQuestion} ${secondQuestion}`,
      sourceIds: citedSources,
      note: "The investigation questions identify the narrative conflict the dossier should develop.",
    },
    {
      claim: `${input.workingTitle} is supported by independent source groups from ${sourceGroups.join(" and ")}, giving the story corroboration beyond a single archive record.`,
      sourceIds: citedSources,
      note: "Readiness requires independent source groups before dossier generation.",
    },
  ].filter((claim) => claim.sourceIds.length > 0);
}
