import type { InferSelectModel } from "drizzle-orm";
import { sources, stories } from "@/db/schema";
import type { StoryScript, StoryScriptInput } from "@/lib/types";
import { isCitedDossier, isCompletedStory } from "./display";
import { generateStoryScript, wordCount } from "./story";
import { PUBLISH_READY_MIN_WORDS } from "./story-length";

export type StoryRow = InferSelectModel<typeof stories>;
export type SourceRow = InferSelectModel<typeof sources>;
export type StoryScriptGenerator = (input: StoryScriptInput) => Promise<StoryScript>;

export async function generateStoryScriptUpdateForDossier(
  story: StoryRow,
  refs: SourceRow[],
  generator: StoryScriptGenerator = generateStoryScript,
  now = () => new Date(),
) {
  if (!refs.length) throw new Error("Story generation requires saved cited sources.");
  const script = await generator(buildStoryScriptInput(story, refs));
  const generatedWords = wordCount(script);
  if (generatedWords < PUBLISH_READY_MIN_WORDS) {
    throw new Error(`Story generation returned ${generatedWords} words; expected at least ${PUBLISH_READY_MIN_WORDS}.`);
  }
  return buildStoryScriptUpdate(script, now());
}

export function needsGeneratedStoryScript(story: StoryRow) {
  return story.scriptStatus !== "generating" && isCitedDossier(story) && !isCompletedStory(story);
}

export function buildStoryScriptInput(story: StoryRow, refs: SourceRow[]): StoryScriptInput {
  return {
    workingTitle: story.workingTitle,
    category: story.category,
    summary: story.summary,
    storyText: story.storyText,
    eventDate: story.eventDate,
    location: story.location,
    premise: story.premise,
    narrativeHook: story.narrativeHook,
    chronology: story.chronology ?? [],
    keyFacts: story.keyFacts ?? [],
    conflicts: story.conflicts ?? [],
    unresolvedRisks: story.unresolvedRisks ?? [],
    outline: story.outline ?? [],
    claimCitations: story.claimCitations ?? [],
    sources: refs.map((ref) => ({
      id: ref.archiveIdentifier ?? ref.id,
      title: ref.title,
      date: ref.publicationDate,
      excerpt: ref.excerpt,
    })),
  };
}

export function buildStoryScriptUpdate(script: StoryScript, timestamp = new Date()) {
  return {
    scriptStatus: "ready" as const,
    scriptHook: script.hook,
    scriptSegments: script.segments,
    scriptClosingLine: script.closingLine,
    scriptDisclaimer: script.disclaimer,
    scriptWordCount: wordCount(script),
    scriptGeneratedAt: timestamp,
    updatedAt: timestamp,
  };
}
