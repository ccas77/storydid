export type InvestigationInput = {
  externalId: string;
  title: string;
  hypothesis: string;
  evidenceSourceIds: string[];
  scores: Record<string, number>;
};

export function evidenceDepthScore(input: Pick<InvestigationInput, "evidenceSourceIds" | "scores">) {
  const sourceCount = new Set(input.evidenceSourceIds).size;
  const sourceSignal = input.scores.sourceSignal ?? 0;
  const specificity = input.scores.specificity ?? 0;
  return Math.min(100, sourceCount * 24 + sourceSignal * 0.45 + specificity * 0.2);
}

export function groupSourceIndependence(sourceIds: string[]) {
  const groups = new Map<string, string[]>();
  for (const sourceId of sourceIds) {
    const group = sourceId.includes("archive.org") || sourceId.includes("internet_archive") ? "internet_archive" : sourceId.includes("loc") ? "library_of_congress" : sourceId.split(":")[0] || "archive_record";
    groups.set(group, [...(groups.get(group) ?? []), sourceId]);
  }
  return Array.from(groups.entries()).map(([group, ids]) => ({ group, sourceIds: Array.from(new Set(ids)) }));
}

export function originalitySignals(input: Pick<InvestigationInput, "title" | "hypothesis">) {
  const text = `${input.title} ${input.hypothesis}`.toLowerCase();
  return [
    text.includes("forgotten") || text.includes("little-known") ? "Metadata suggests an explicitly overlooked story." : undefined,
    text.includes("inquest") || text.includes("testimony") ? "Inquiry or testimony records may contain underused primary-source detail." : undefined,
    text.includes("local") || text.includes("town") ? "Local framing may not have been developed for a broader audience." : undefined,
  ].filter((item): item is string => Boolean(item));
}

export function researchQuestionsFor(input: InvestigationInput) {
  return [
    `What exactly happened in ${input.title}?`,
    "Who were the central people affected, accused, blamed, or vindicated?",
    "Which independent sources corroborate the core claim?",
    "What evidence would change or weaken the current story premise?",
  ];
}

export function shouldDowngradeInvestigation(input: InvestigationInput) {
  const depth = evidenceDepthScore(input);
  const narrativeSignal = input.scores.narrativeSignal ?? 0;
  if (depth < 35) return "Evidence depth is too thin for controlled investigation.";
  if (narrativeSignal < 30) return "Narrative signal remains too weak after funnel scoring.";
  return undefined;
}
