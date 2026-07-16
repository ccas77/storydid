import type { ArchiveRecord } from "@/lib/types";

export type RejectionCode =
  | "duplicate"
  | "weak_record"
  | "institutional_minutiae"
  | "low_narrative_potential";

export type FunnelDecision = {
  record: ArchiveRecord;
  normalizedKey: string;
  hypothesis: string;
  status: "active" | "duplicate" | "rejected";
  rejectionCode?: RejectionCode;
  rejectionReason?: string;
  duplicateOf?: string;
  evidenceSourceIds: string[];
  scores: {
    narrativeSignal: number;
    sourceSignal: number;
    specificity: number;
  };
};

export type StageBudget = {
  maxRecords: number;
  maxSearches: number;
  maxModelCalls: number;
};

const institutionalTerms = [
  "annual report",
  "arrangements for address",
  "anthology",
  "board minutes",
  "committee minutes",
  "correspondence",
  "meeting minutes",
  "proceedings",
  "catalogue",
  "directory",
  "budget estimate",
  "appropriation bill",
  "retirement dinner",
];

const archiveNoiseTerms = [
  "cia reading room",
  "literatures of colonial america",
];

const narrativeTerms = [
  "trial",
  "inquest",
  "murder",
  "fraud",
  "scandal",
  "disaster",
  "survivor",
  "testimony",
  "impostor",
  "mystery",
  "riot",
  "collapse",
  "explosion",
  "inheritance",
  "confession",
  "investigation",
];

export function defaultStageBudget(stage: string): StageBudget {
  if (stage === "discovery") return { maxRecords: 48, maxSearches: 8, maxModelCalls: 0 };
  if (stage === "candidate_funnel") return { maxRecords: 80, maxSearches: 0, maxModelCalls: 0 };
  if (stage === "deep_research") return { maxRecords: 18, maxSearches: 6, maxModelCalls: 1 };
  if (stage === "dossier_readiness") return { maxRecords: 8, maxSearches: 0, maxModelCalls: 1 };
  return { maxRecords: 12, maxSearches: 0, maxModelCalls: 0 };
}

export function applyRecordBudget<T>(items: T[], budget: Pick<StageBudget, "maxRecords">) {
  return items.slice(0, Math.max(0, budget.maxRecords));
}

export function normalizeCandidateKey(record: ArchiveRecord) {
  return `${record.title} ${record.date ?? ""} ${record.location ?? ""}`
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|and|of|for|in|to|with|on|at|by)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function buildCandidateFunnel(records: ArchiveRecord[], budget = defaultStageBudget("candidate_funnel"), context = "") {
  const contextTerms = relevanceTerms(context);
  const seen = new Map<string, string>();
  const decisions = applyRecordBudget(records, budget).map((record): FunnelDecision => {
    const normalizedKey = normalizeCandidateKey(record);
    const duplicateOf = seen.get(normalizedKey);
    if (duplicateOf) {
      return {
        record,
        normalizedKey,
        hypothesis: hypothesisFor(record),
        status: "duplicate",
        rejectionCode: "duplicate",
        rejectionReason: "Record appears to describe the same underlying lead as an earlier archive record.",
        duplicateOf,
        evidenceSourceIds: [evidenceSourceId(record)],
        scores: scoreRecord(record),
      };
    }
    seen.set(normalizedKey, record.id);

    const rejection = rejectRecord(record);
    if (rejection) {
      return {
        record,
        normalizedKey,
        hypothesis: hypothesisFor(record),
        status: "rejected",
        rejectionCode: rejection.code,
        rejectionReason: rejection.reason,
        evidenceSourceIds: [evidenceSourceId(record)],
        scores: scoreRecord(record),
      };
    }
    if (contextTerms.size && !recordMatchesContext(record, contextTerms)) {
      return {
        record,
        normalizedKey,
        hypothesis: hypothesisFor(record),
        status: "rejected",
        rejectionCode: "low_narrative_potential",
        rejectionReason: "The record does not match enough distinctive terms from the beat or research brief.",
        evidenceSourceIds: [evidenceSourceId(record)],
        scores: scoreRecord(record),
      };
    }

    return {
      record,
      normalizedKey,
      hypothesis: hypothesisFor(record),
      status: "active",
      evidenceSourceIds: [evidenceSourceId(record)],
      scores: scoreRecord(record),
    };
  });
  return mergeRelatedEvidence(mergeDuplicateEvidence(decisions));
}

export function rejectRecord(record: ArchiveRecord): { code: Exclude<RejectionCode, "duplicate">; reason: string } | undefined {
  const text = `${record.title} ${record.description ?? ""}`.toLowerCase();
  const title = record.title.toLowerCase();
  if (record.title.trim().length < 8 || (!record.description && !record.date)) {
    return { code: "weak_record", reason: "The record lacks enough title, date, or description detail to support a story hypothesis." };
  }
  if (archiveNoiseTerms.some((term) => title.includes(term))) {
    return { code: "institutional_minutiae", reason: "The record is an archive container or institutional file rather than a story lead." };
  }
  if (institutionalTerms.some((term) => text.includes(term)) && !narrativeTerms.some((term) => text.includes(term))) {
    return { code: "institutional_minutiae", reason: "The record appears to be routine institutional material without clear narrative stakes." };
  }
  if (scoreRecord(record).narrativeSignal < 20) {
    return { code: "low_narrative_potential", reason: "The metadata does not show enough conflict, consequence, mystery, or human stakes." };
  }
  return undefined;
}

function scoreRecord(record: ArchiveRecord) {
  const text = `${record.title} ${record.description ?? ""}`.toLowerCase();
  const narrativeSignal = Math.min(100, narrativeTerms.filter((term) => text.includes(term)).length * 18 + (record.description ? 12 : 0));
  const sourceSignal = Math.min(100, 35 + (record.date ? 20 : 0) + (record.location ? 15 : 0) + (record.description ? 20 : 0));
  const specificity = Math.min(100, 20 + Math.min(record.title.length, 80) + (record.date ? 10 : 0));
  return { narrativeSignal, sourceSignal, specificity };
}

function hypothesisFor(record: ArchiveRecord) {
  const place = record.location ? ` in ${record.location}` : "";
  const date = record.date ? ` around ${record.date}` : "";
  return `${record.title}${place}${date}`.trim();
}

function mergeDuplicateEvidence(decisions: FunnelDecision[]) {
  const evidenceByRoot = new Map<string, string[]>();
  for (const decision of decisions) {
    const rootId = decision.duplicateOf ?? decision.record.id;
    evidenceByRoot.set(rootId, [
      ...(evidenceByRoot.get(rootId) ?? []),
      ...decision.evidenceSourceIds,
    ]);
  }
  return decisions.map((decision) => {
    if (decision.status !== "active") return decision;
    return {
      ...decision,
      evidenceSourceIds: Array.from(new Set(evidenceByRoot.get(decision.record.id) ?? decision.evidenceSourceIds)),
    };
  });
}

function mergeRelatedEvidence(decisions: FunnelDecision[]) {
  const active = decisions.filter((decision) => decision.status === "active");
  const duplicateOf = new Map<string, string>();
  const evidenceByRoot = new Map<string, string[]>();

  for (const seed of active) {
    if (duplicateOf.has(seed.record.id)) continue;
    const cluster = active.filter((candidate) => !duplicateOf.has(candidate.record.id) && recordsAppearRelated(seed, candidate));
    const root = cluster.sort((a, b) => rootScore(b) - rootScore(a))[0] ?? seed;
    evidenceByRoot.set(root.record.id, cluster.flatMap((candidate) => candidate.evidenceSourceIds));
    for (const candidate of cluster) {
      if (candidate.record.id !== root.record.id) duplicateOf.set(candidate.record.id, root.record.id);
    }
  }

  return decisions.map((decision) => {
    if (decision.status !== "active") return decision;
    const rootId = duplicateOf.get(decision.record.id);
    if (rootId) {
      return {
        ...decision,
        status: "duplicate" as const,
        rejectionCode: "duplicate" as const,
        rejectionReason: "Record is supporting evidence for a stronger candidate about the same underlying story.",
        duplicateOf: rootId,
      };
    }
    return {
      ...decision,
      evidenceSourceIds: Array.from(new Set(evidenceByRoot.get(decision.record.id) ?? decision.evidenceSourceIds)),
    };
  });
}

function rootScore(decision: FunnelDecision) {
  const title = decision.record.title.toLowerCase();
  const titleNarrativeBonus = narrativeTerms.filter((term) => title.includes(term)).length * 28;
  const containerPenalty = /\b(times|mail|gazette|news|herald|tribune)\b/i.test(decision.record.title) ? 18 : 0;
  return decision.scores.narrativeSignal * 2 + decision.scores.sourceSignal + decision.scores.specificity + titleNarrativeBonus - containerPenalty;
}

function recordsAppearRelated(a: FunnelDecision, b: FunnelDecision) {
  if (a.record.id === b.record.id) return true;
  const aTerms = candidateTerms(a);
  const bTerms = candidateTerms(b);
  const overlap = [...aTerms].filter((term) => bTerms.has(term));
  return overlap.length >= 2 && overlap.some((term) => term.length >= 6);
}

function candidateTerms(decision: FunnelDecision) {
  return relevanceTerms(`${decision.record.title} ${decision.record.description ?? ""} ${decision.hypothesis}`);
}

function recordMatchesContext(record: ArchiveRecord, contextTerms: Set<string>) {
  const terms = relevanceTerms(`${record.title} ${record.description ?? ""} ${record.location ?? ""} ${record.date ?? ""}`);
  const overlap = [...contextTerms].filter((term) => terms.has(term));
  const requiredOverlap = contextTerms.size >= 5 ? 3 : Math.min(2, contextTerms.size);
  return overlap.length >= requiredOverlap;
}

function relevanceTerms(value: string) {
  return new Set(value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 4 || /^(18|19|20)\d{2}$/.test(term))
    .filter((term) => !["about", "after", "around", "before", "between", "committee", "great", "independent", "investigation", "newspaper", "report", "testimony"].includes(term)));
}

function evidenceSourceId(record: ArchiveRecord) {
  return `${record.source}:${record.id}`;
}
