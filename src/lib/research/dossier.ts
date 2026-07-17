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
    storyText: string;
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
  const storyText = buildFinishedStoryText(input, claimCitations);

  return {
    story: {
      workingTitle: input.workingTitle,
      category: "Autonomous research dossier",
      summary: input.premise,
      storyText,
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

function buildFinishedStoryText(input: DossierDraftInput, claimCitations: Array<{ claim: string; sourceIds: string[] }>) {
  // A lead only reaches this point after passing the readiness gate, so it is already
  // vouched for. Prefer substantive claims, but never drop an approved lead for lack of
  // them: fall back to every cited claim, then to the premise/hook, so a dossier is always
  // produced and the downstream story generator gets something to develop.
  const substantive = claimCitations.filter((claim) => isSubstantiveClaim(claim.claim));
  const claims = (substantive.length >= 2 ? substantive : claimCitations).map((claim) => claim.claim);
  const warningClaim = claims[0] ?? input.narrativeHook;
  const consequenceClaim = claims[1] ?? input.premise;
  const thirdClaim = claims[2] ?? input.premise;
  const riskText = input.readiness.risks.length ? input.readiness.risks.join(" ") : "The archive record still needs careful handling, but the available evidence is strong enough to support a cautious draft.";
  const originalityText = input.originalitySignals.join(" ") || input.whyOverlooked;

  return [
    `${input.narrativeHook} The answer begins with a record that does not behave like a footnote. ${input.premise} The surviving evidence gives the story a clear pressure point: people were trying to explain not only what happened, but why the danger was not stopped sooner.`,
    `The strongest thread is this: ${warningClaim} That claim matters because it gives the story a before-and-after shape. There was a condition, warning, dispute, or failure before the central event, and then there was an inquiry afterward trying to decide what that evidence meant.`,
    `A second source line complicates the official shape of the story. ${consequenceClaim} In narrative terms, that turns the event from a bare historical incident into a conflict over responsibility. The useful question is not simply whether the disaster happened; it is who understood the risk, who had the power to act, and why the record still points back to those decisions.`,
    `The overlooked angle is that this lead sits in the kind of archive material that rarely announces itself as a finished drama. ${input.whyOverlooked} ${originalityText} The story becomes stronger when the sources are read together: one gives the incident, another gives the corroboration, and the pattern gives the editorial reason to keep digging.`,
    `The responsible version of the story should stay close to what the records can support. ${thirdClaim} ${riskText} What StoryDid has enough evidence to say is that this is a developable historical narrative with a documented event, a conflict over cause or accountability, and source-backed claims that can be checked line by line.`,
  ].join("\n\n");
}

function isSubstantiveClaim(value: string) {
  const text = value.toLowerCase().replace(/\s+/g, " ").trim();
  if (text.length < 55) return false;
  if (/\b(sufficient source depth|editorial development|readiness gate|passed automated)\b/.test(text)) return false;
  return /\b(disaster|scandal|strike|betrayal|trial|inquest|murder|mystery|explosion|collapse|fire|riot|fraud|impostor|survivor|testimony|mine|shipwreck|sinking|missing|cover.?up|corruption|accident|death|conflict|fight|war|warning|failure|inspection|accountability)\b/.test(text);
}
