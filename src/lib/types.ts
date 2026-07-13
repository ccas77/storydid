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
