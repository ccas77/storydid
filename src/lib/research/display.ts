export function isResearchedRecommendation(item: { confidence: number; researchCompleteness: number; strongestEvidence: unknown; status: string }) {
  return item.status === "dossier_ready" || (
    item.confidence >= 45 &&
    item.researchCompleteness >= 45 &&
    evidenceCount(item.strongestEvidence) > 0
  );
}

export function isCitedDossier(item: {
  confidenceScore: number;
  researchCompleteness: number;
  claimCitations: unknown;
  storyText?: string | null;
  workingTitle?: string;
  summary?: string;
  premise?: string | null;
  keyFacts?: unknown;
  chronology?: unknown;
}) {
  return item.confidenceScore >= 45 &&
    item.researchCompleteness >= 45 &&
    citationCount(item.claimCitations) > 0 &&
    substantiveClaimCount(item.claimCitations) >= 2 &&
    isFinishedStoryText(item.storyText) &&
    hasDevelopedStoryMaterial(item) &&
    isStoryLike(item);
}

export function uniqueEditorialStories<T extends { workingTitle: string; summary: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeStoryKey(item.workingTitle || item.summary);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function substantiveClaimCount(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const claim = (item as Record<string, unknown>).claim;
    return typeof claim === "string" && isSubstantiveClaim(claim);
  }).length : 0;
}

function hasDevelopedStoryMaterial(item: { keyFacts?: unknown; chronology?: unknown }) {
  const keyFacts = Array.isArray(item.keyFacts) ? item.keyFacts.filter((fact) => typeof fact === "string" && isSubstantiveClaim(fact)) : [];
  const chronology = Array.isArray(item.chronology) ? item.chronology.filter((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const event = (entry as Record<string, unknown>).event;
    return typeof event === "string" && isSubstantiveClaim(event);
  }) : [];
  return keyFacts.length >= 3 || chronology.length >= 2;
}

function isStoryLike(item: { workingTitle?: string; summary?: string; premise?: string | null }) {
  const text = `${item.workingTitle ?? ""} ${item.summary ?? ""} ${item.premise ?? ""}`.toLowerCase();
  if (!text.trim()) return false;
  if (archiveContainerPattern.test(text)) return false;
  if (routineInstitutionPattern.test(text)) return false;
  if (dateOnlyTitlePattern.test(item.workingTitle ?? "")) return false;
  return narrativeCuePattern.test(text);
}

function normalizeStoryKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|story|dossier)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSubstantiveClaim(value: string) {
  const text = value.toLowerCase().replace(/\s+/g, " ").trim();
  if (text.length < 55) return false;
  if (genericClaimPattern.test(text)) return false;
  if (/^the .+ around \d{4}/.test(text)) return false;
  return narrativeCuePattern.test(text);
}

function isFinishedStoryText(value: string | null | undefined) {
  if (!value) return false;
  const text = value.replace(/\s+/g, " ").trim();
  const paragraphs = value.split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length >= 120);
  if (text.length < 700) return false;
  if (paragraphs.length < 4) return false;
  if (genericClaimPattern.test(text.toLowerCase())) return false;
  if (!narrativeCuePattern.test(text.toLowerCase())) return false;
  return true;
}

const archiveContainerPattern = /\b(cia reading room|pages? georgia pages?|anthology|literatures of|jprs id|arrangements for address|retirement dinner|daily press \d{4}|telegraph \d{4}|mail \d{4}|degrees north)\b/;
const routineInstitutionPattern = /\b(minutes?|annual report|directory|bibliography|address commemorative|memoir|novel|anthology)\b/;
const dateOnlyTitlePattern = /^\d{4}\s+[a-z]+\s+\d{1,2}\s+/i;
const narrativeCuePattern = /\b(disaster|scandal|strike|betrayal|trial|inquest|murder|mystery|explosion|collapse|fire|riot|fraud|impostor|survivor|testimony|mine|shipwreck|sinking|missing|cover.?up|corruption|accident|death|conflict|fight|war|warning|failure)\b/;
const genericClaimPattern = /\b(sufficient source depth|editorial development|passed automated|readiness gate|story lead storydid found|originality requires editorial review)\b/;
