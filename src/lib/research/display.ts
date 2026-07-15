export function isResearchedRecommendation(item: { confidence: number; researchCompleteness: number; strongestEvidence: unknown; status: string }) {
  return item.status === "dossier_ready" || (
    item.confidence >= 45 &&
    item.researchCompleteness >= 45 &&
    evidenceCount(item.strongestEvidence) > 0
  );
}

export function isCitedDossier(item: { confidenceScore: number; researchCompleteness: number; claimCitations: unknown }) {
  return item.confidenceScore >= 45 &&
    item.researchCompleteness >= 45 &&
    citationCount(item.claimCitations) > 0;
}

function evidenceCount(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).claim === "string").length : 0;
}

function citationCount(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const sourceIds = (item as Record<string, unknown>).sourceIds;
    return typeof (item as Record<string, unknown>).claim === "string" && Array.isArray(sourceIds) && sourceIds.length > 0;
  }).length : 0;
}
