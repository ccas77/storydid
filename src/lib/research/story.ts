import OpenAI from "openai";
import { z } from "zod";
import { PUBLISH_READY_MAX_WORDS, PUBLISH_READY_MIN_WORDS, PUBLISH_READY_TARGET_WORDS } from "./story-length";
import type { StoryScript, StoryScriptInput } from "@/lib/types";

const scriptSchema = z.object({
  hook: z.string().min(20),
  segments: z.array(z.object({
    heading: z.string().min(3),
    narration: z.string().min(80),
    sourceIds: z.array(z.string()),
  })).min(5).max(9),
  closingLine: z.string().min(20),
  disclaimer: z.string().min(20),
});

const scriptJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hook", "segments", "closingLine", "disclaimer"],
  properties: {
    hook: { type: "string" },
    segments: {
      type: "array",
      minItems: 5,
      maxItems: 9,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "narration", "sourceIds"],
        properties: {
          heading: { type: "string" },
          narration: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    closingLine: { type: "string" },
    disclaimer: { type: "string" },
  },
} as const;

export async function generateStoryScript(input: StoryScriptInput): Promise<StoryScript> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured; story generation cannot run.");
  }
  if (!input.sources.length) {
    throw new Error("Story generation requires saved cited sources.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const validSourceIds = new Set(input.sources.map((source) => source.id));
  const response = await client.responses.create({
    model: process.env.STORY_MODEL ?? process.env.RESEARCH_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content: [
          "You are StoryDid's narrative editor.",
          "Turn an approved, source-backed historical dossier into a finished narrative script.",
          "Use only the supplied dossier and source records. Never add facts, names, dates, causes, quotes, or motives that are not supported by the input.",
          "Treat newspaper claims and accusations as allegations unless the dossier proves them independently.",
          "Follow the dossier outline as the story spine when it exists.",
          `Write a cold-open hook, outline-driven story segments, a closing line, and a short evidence disclaimer totaling about ${PUBLISH_READY_TARGET_WORDS} words.`,
          "Every segment must cite one or more supplied source IDs. Use only exact source IDs from the input.",
          "Do not output links, markdown, bullet lists, placeholders, or process commentary.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          dossier: {
            workingTitle: input.workingTitle,
            category: input.category,
            summary: input.summary,
            storyText: input.storyText,
            eventDate: input.eventDate,
            location: input.location,
            premise: input.premise,
            narrativeHook: input.narrativeHook,
            chronology: input.chronology,
            keyFacts: input.keyFacts,
            conflicts: input.conflicts,
            unresolvedRisks: input.unresolvedRisks,
            outline: input.outline,
            claimCitations: input.claimCitations,
          },
          sources: input.sources,
          target: `A ${PUBLISH_READY_MIN_WORDS}-${PUBLISH_READY_MAX_WORDS} word narrative script for a general audience.`,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "story_script",
        strict: true,
        schema: scriptJsonSchema,
      },
    },
  }, { timeout: 30_000, maxRetries: 0 });

  const parsed = scriptSchema.parse(JSON.parse(response.output_text));
  const cleaned = sanitizeStoryScript(parsed, validSourceIds);
  if (!cleaned.segments.some((segment) => segment.sourceIds.length > 0)) {
    throw new Error("Story generation returned no valid source citations.");
  }
  const generatedWords = wordCount(cleaned);
  if (generatedWords < PUBLISH_READY_MIN_WORDS) {
    throw new Error(`Story generation returned ${generatedWords} words; expected at least ${PUBLISH_READY_MIN_WORDS}.`);
  }
  return cleaned;
}

export function sanitizeStoryScript(script: StoryScript, validSourceIds: Set<string>): StoryScript {
  return {
    hook: cleanText(script.hook),
    segments: script.segments.map((segment) => ({
      heading: cleanText(segment.heading),
      narration: cleanText(segment.narration),
      sourceIds: unique(segment.sourceIds.filter((sourceId) => validSourceIds.has(sourceId))),
    })).filter((segment) => segment.heading && segment.narration),
    closingLine: cleanText(script.closingLine),
    disclaimer: cleanText(script.disclaimer),
  };
}

export function wordCount(script: StoryScript) {
  return [
    script.hook,
    ...script.segments.map((segment) => segment.narration),
    script.closingLine,
    script.disclaimer,
  ].join(" ").split(/\s+/).filter(Boolean).length;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
