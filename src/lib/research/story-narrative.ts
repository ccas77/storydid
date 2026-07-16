type ClaimCitation = {
  claim: string;
  sourceIds: string[];
};

type StoryNarrativeInput = {
  workingTitle: string;
  summary: string;
  premise?: string | null;
  narrativeHook?: string | null;
  whyOverlooked?: string | null;
  originalityAssessment?: string | null;
  keyFacts?: string[] | null;
  unresolvedRisks?: string[] | null;
  conflicts?: string[] | null;
  claimCitations?: ClaimCitation[] | null;
};

export function buildStoryNarrative(input: StoryNarrativeInput) {
  const claims = cleanClaims(input.claimCitations);
  const facts = cleanStrings(input.keyFacts);
  const risks = cleanStrings(input.unresolvedRisks).length ? cleanStrings(input.unresolvedRisks) : cleanStrings(input.conflicts);
  const opening = input.narrativeHook?.trim() || input.premise?.trim() || input.summary.trim();
  const premise = input.premise?.trim() || input.summary.trim();
  const evidenceClaims = claims.length ? claims : facts.slice(0, 3).map((claim) => ({ claim, sourceIds: [] }));

  const paragraphs = [
    `${opening} That is the story lead StoryDid found behind ${input.workingTitle}: ${premise}`,
    evidenceClaims.length
      ? `The evidence trail starts with this: ${joinClaimSentences(evidenceClaims.slice(0, 3))}`
      : `The available saved record frames the central premise this way: ${input.summary}`,
    input.whyOverlooked?.trim()
      ? `Why it has been easy to miss: ${input.whyOverlooked.trim()}`
      : "Why it has been easy to miss: the lead surfaced through scattered archive records rather than a clean, already-packaged historical account.",
    input.originalityAssessment?.trim()
      ? `The editorial angle is its originality: ${input.originalityAssessment.trim()}`
      : "The editorial angle is not simply that the event happened, but that the archive trail suggests a specific conflict worth turning into a narrative.",
  ];

  if (risks.length) {
    paragraphs.push(`What still needs caution: ${risks.slice(0, 3).join(" ")}`);
  }

  return paragraphs;
}

function joinClaimSentences(claims: ClaimCitation[]) {
  return claims.map((claim, index) => `${claim.claim}${citationMarker(index)}`).join(" ");
}

function citationMarker(index: number) {
  return ` [C${index + 1}]`;
}

function cleanClaims(value: ClaimCitation[] | null | undefined) {
  return Array.isArray(value)
    ? value.filter((claim) => typeof claim.claim === "string" && claim.claim.trim().length > 0)
    : [];
}

function cleanStrings(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim().length > 0) : [];
}
