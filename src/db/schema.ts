import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const storyStatus = pgEnum("story_status", ["candidate", "researching", "ready", "rejected", "published"]);
export const recommendationStatus = pgEnum("recommendation_status", ["recommended", "developing", "angle_requested", "investigate_further", "dismissed", "dossier_ready"]);
export const clusterStatus = pgEnum("cluster_status", ["candidate", "merged", "rejected", "researching", "recommended", "dossier_ready"]);

export const stories = pgTable("stories", {
  id: uuid("id").defaultRandom().primaryKey(),
  workingTitle: text("working_title").notNull(),
  category: text("category").notNull(),
  summary: text("summary").notNull(),
  eventDate: text("event_date"),
  location: text("location"),
  status: storyStatus("status").default("candidate").notNull(),
  interestScore: integer("interest_score").default(0).notNull(),
  sourceScore: integer("source_score").default(0).notNull(),
  competitionScore: integer("competition_score").default(0).notNull(),
  confidenceScore: integer("confidence_score").default(0).notNull(),
  chronology: jsonb("chronology").$type<Array<{ date: string; event: string }>>().default([]),
  keyFacts: jsonb("key_facts").$type<string[]>().default([]),
  conflicts: jsonb("conflicts").$type<string[]>().default([]),
  titles: jsonb("titles").$type<string[]>().default([]),
  outline: jsonb("outline").$type<Array<{ heading: string; notes: string }>>().default([]),
  premise: text("premise"),
  narrativeHook: text("narrative_hook"),
  whyOverlooked: text("why_overlooked"),
  originalityAssessment: text("originality_assessment"),
  unresolvedRisks: jsonb("unresolved_risks").$type<string[]>().default([]),
  researchCompleteness: integer("research_completeness").default(0).notNull(),
  recommendedNextAction: text("recommended_next_action"),
  claimCitations: jsonb("claim_citations").$type<Array<{ claim: string; sourceIds: string[] }>>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyId: uuid("story_id").references(() => stories.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  publisher: text("publisher"),
  publicationDate: text("publication_date"),
  sourceType: text("source_type").notNull(),
  archiveIdentifier: text("archive_identifier"),
  excerpt: text("excerpt"),
  primarySource: boolean("primary_source").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const researchRuns = pgTable("research_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: text("status").notNull(),
  querySet: jsonb("query_set").$type<string[]>().default([]),
  candidatesFound: integer("candidates_found").default(0).notNull(),
  storiesSaved: integer("stories_saved").default(0).notNull(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const archiveRecords = pgTable("archive_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").references(() => researchRuns.id, { onDelete: "set null" }),
  externalId: text("external_id").notNull(),
  source: text("source").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  recordDate: text("record_date"),
  location: text("location"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const storyClusters = pgTable("story_clusters", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").references(() => researchRuns.id, { onDelete: "set null" }),
  status: clusterStatus("status").default("candidate").notNull(),
  label: text("label").notNull(),
  hypothesis: text("hypothesis").notNull(),
  mergeKey: text("merge_key").notNull(),
  recordIds: jsonb("record_ids").$type<string[]>().default([]),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const editorialRecommendations = pgTable("editorial_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").references(() => researchRuns.id, { onDelete: "set null" }),
  clusterId: uuid("cluster_id").references(() => storyClusters.id, { onDelete: "set null" }),
  storyId: uuid("story_id").references(() => stories.id, { onDelete: "set null" }),
  status: recommendationStatus("status").default("recommended").notNull(),
  workingTitle: text("working_title").notNull(),
  premise: text("premise").notNull(),
  narrativeHook: text("narrative_hook").notNull(),
  whyOverlooked: text("why_overlooked").notNull(),
  strongestEvidence: jsonb("strongest_evidence").$type<Array<{ claim: string; sourceIds: string[]; note: string }>>().default([]),
  originalityAssessment: text("originality_assessment").notNull(),
  unresolvedRisks: jsonb("unresolved_risks").$type<string[]>().default([]),
  confidence: integer("confidence").default(0).notNull(),
  researchCompleteness: integer("research_completeness").default(0).notNull(),
  recommendedNextAction: text("recommended_next_action").notNull(),
  scores: jsonb("scores").$type<{ narrativeTension: number; sourceStrength: number; originality: number; humanInterest: number; historicalConsequence: number; researchability: number }>().default({
    narrativeTension: 0,
    sourceStrength: 0,
    originality: 0,
    humanInterest: 0,
    historicalConsequence: 0,
    researchability: 0
  }),
  sourceIds: jsonb("source_ids").$type<string[]>().default([]),
  followUpQueries: jsonb("follow_up_queries").$type<string[]>().default([]),
  downgradeReason: text("downgrade_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const researchActivity = pgTable("research_activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").references(() => researchRuns.id, { onDelete: "set null" }),
  recommendationId: uuid("recommendation_id").references(() => editorialRecommendations.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
