export type ArchiveRecord = {
  id: string;
  title: string;
  url: string;
  date?: string;
  location?: string;
  description?: string;
  text?: string;
  source: "loc" | "internet_archive";
};

export type StoryDossier = {
  workingTitle: string;
  category: string;
  summary: string;
  storyText: string;
  eventDate?: string;
  location?: string;
  scores: { interest: number; sources: number; competition: number; confidence: number };
  chronology: Array<{ date: string; event: string }>;
  keyFacts: string[];
  conflicts: string[];
  titles: string[];
  outline: Array<{ heading: string; notes: string }>;
  sourceIds: string[];
};

export type EditorialScorecard = {
  narrativeTension: number;
  sourceStrength: number;
  originality: number;
  humanInterest: number;
  historicalConsequence: number;
  researchability: number;
};

export type EvidenceClaim = {
  claim: string;
  sourceIds: string[];
  note: string;
};

export type EditorialRecommendation = {
  clusterLabel: string;
  mergeKey: string;
  workingTitle: string;
  premise: string;
  narrativeHook: string;
  whyOverlooked: string;
  strongestEvidence: EvidenceClaim[];
  originalityAssessment: string;
  unresolvedRisks: string[];
  confidence: number;
  researchCompleteness: number;
  recommendedNextAction: string;
  scores: EditorialScorecard;
  sourceIds: string[];
  followUpQueries: string[];
  downgradeReason?: string;
  shouldCreateDossier: boolean;
  dossier?: {
    category: string;
    summary: string;
    storyText: string;
    eventDate?: string;
    location?: string;
    chronology: Array<{ date: string; event: string }>;
    keyFacts: string[];
    conflicts: string[];
    titles: string[];
    outline: Array<{ heading: string; notes: string }>;
  };
};

export type ResearchDecisionSet = {
  rejected: Array<{ title: string; reason: string; sourceIds: string[] }>;
  merged: Array<{ title: string; reason: string; sourceIds: string[] }>;
  recommendations: EditorialRecommendation[];
};

export type InvestigationPlan = {
  candidateExternalId: string;
  workingTitle: string;
  premise: string;
  researchQuestions: string[];
  followUpQueries: string[];
  originalitySignals: string[];
  evidenceDepth: number;
  sourceIndependence: Array<{ group: string; sourceIds: string[] }>;
  downgradeReason?: string;
};
