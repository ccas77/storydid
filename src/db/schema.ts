import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const storyStatus = pgEnum("story_status", ["candidate", "researching", "ready", "rejected", "published"]);

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
