import OpenAI from "openai";
import { z } from "zod";
import { PUBLISH_READY_MAX_WORDS, PUBLISH_READY_MIN_WORDS, PUBLISH_READY_TARGET_WORDS } from "./story-length";
import type { StoryScript, StoryScriptInput, StoryScriptSegment } from "@/lib/types";

const MAX_EXPANSION_ROUNDS = 6;
const STORY_TIMEOUT_MS = 120_000;
const STORY_MAX_RETRIES = 2;
const MIN_SEGMENTS = 6;
const MAX_SEGMENTS = 16;

const segmentSchema = z.object({
  heading: z.string().min(3),
  narration: z.string().min(80),
  sourceIds: z.array(z.string()),
});

const scriptSchema = z.object({
  hook: z.string().min(20),
  segments: z.array(segmentSchema).min(1),
  closingLine: z.string().min(20),
  disclaimer: z.string().min(20),
});

const expansionSchema = z.object({
  segments: z.array(segmentSchema).min(1),
});

const segmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["heading", "narration", "sourceIds"],
  properties: {
    heading: { type: "string" },
    narration: { type: "string" },
    sourceIds: { type: "array", items: { type: "string" } },
  },
} as const;

const scriptJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hook", "segments", "closingLine", "disclaimer"],
  properties: {
    hook: { type: "string" },
    segments: { type: "array", minItems: MIN_SEGMENTS, maxItems: MAX_SEGMENTS, items: segmentJsonSchema },
    closingLine: { type: "string" },
    disclaimer: { type: "string" },
  },
} as const;

const expansionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["segments"],
  properties: {
    segments: { type: "array", minItems: 1, maxItems: 6, items: segmentJsonSchema },
  },
} as const;

/**
 * A single structured model call. Returns the parsed JSON object for the given schema.
 * Injectable so the expansion loop can be exercised in tests without a live API key.
 */
export type StoryScriptModel = (request: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
}) => Promise<unknown>;

const SYSTEM_PROMPT = [
  "You are StoryDid's longform narrative editor.",
  "Turn an approved, source-backed historical dossier into a finished, publish-ready longform article for a general audience.",
  "Use only the supplied dossier and source records. Never add facts, names, dates, causes, quotes, or motives that are not supported by the input.",
  "Treat newspaper claims and accusations as allegations unless the dossier proves them independently.",
  "Follow the dossier outline as the story spine when it exists, and develop each beat with concrete, sourced detail.",
  "Write immersive, flowing prose in full paragraphs. Do not output links, markdown, bullet lists, headings inside narration, placeholders, or process commentary.",
  "Every segment must cite one or more supplied source IDs, using only the exact source IDs from the input.",
].join(" ");

export async function generateStoryScript(
  input: StoryScriptInput,
  model: StoryScriptModel = defaultStoryModel,
): Promise<StoryScript> {
  if (!input.sources.length) {
    throw new Error("Story generation requires saved cited sources.");
  }
  const validSourceIds = new Set(input.sources.map((source) => source.id));
  const dossierPayload = buildDossierPayload(input);

  const initialRaw = await model({
    system: SYSTEM_PROMPT,
    schemaName: "story_script",
    schema: scriptJsonSchema,
    user: JSON.stringify({
      dossier: dossierPayload,
      sources: input.sources,
      instructions: [
        `Write a complete longform article of at least ${PUBLISH_READY_MIN_WORDS} words (aim for about ${PUBLISH_READY_TARGET_WORDS}, and do not exceed ${PUBLISH_READY_MAX_WORDS}).`,
        `Produce a cold-open hook, ${MIN_SEGMENTS} or more substantial story segments of roughly 220-320 words each, a closing line, and a short evidence disclaimer.`,
        "Each segment should advance the narrative rather than restating the previous one.",
      ],
    }),
  });

  let script = sanitizeStoryScript(scriptSchema.parse(initialRaw), validSourceIds);
  script = await expandToLength(script, input, dossierPayload, validSourceIds, model);

  if (!script.segments.some((segment) => segment.sourceIds.length > 0)) {
    throw new Error("Story generation returned no valid source citations.");
  }
  const generatedWords = wordCount(script);
  if (generatedWords < PUBLISH_READY_MIN_WORDS) {
    throw new Error(`Story generation returned ${generatedWords} words after expansion; expected at least ${PUBLISH_READY_MIN_WORDS}.`);
  }
  return script;
}

/**
 * Keeps requesting additional source-grounded segments until the article clears the
 * word target. Appending segments only ever increases length, so this converges as
 * long as the model returns usable content; it stops early if a round adds nothing.
 */
async function expandToLength(
  script: StoryScript,
  input: StoryScriptInput,
  dossierPayload: Record<string, unknown>,
  validSourceIds: Set<string>,
  model: StoryScriptModel,
): Promise<StoryScript> {
  let current = script;
  for (let round = 0; round < MAX_EXPANSION_ROUNDS; round += 1) {
    const words = wordCount(current);
    if (words >= PUBLISH_READY_TARGET_WORDS || current.segments.length >= MAX_SEGMENTS) break;

    const deficit = PUBLISH_READY_TARGET_WORDS - words;
    const raw = await model({
      system: SYSTEM_PROMPT,
      schemaName: "story_expansion",
      schema: expansionJsonSchema,
      user: JSON.stringify({
        dossier: dossierPayload,
        sources: input.sources,
        currentArticle: {
          hook: current.hook,
          segmentHeadings: current.segments.map((segment) => segment.heading),
          wordCount: words,
        },
        instructions: [
          `The article is ${words} words but must reach at least ${PUBLISH_READY_MIN_WORDS} words; add roughly ${deficit} more words.`,
          "Return only NEW segments that continue and deepen the same article using the supplied sources.",
          "Do not repeat earlier segments or restate the hook. Do not renumber or return existing segments.",
          "Each new segment must cite one or more exact source IDs from the input.",
        ],
      }),
    });

    const extra = sanitizeSegments(expansionSchema.parse(raw).segments, validSourceIds);
    if (!extra.length) break;
    current = {
      ...current,
      segments: [...current.segments, ...extra].slice(0, MAX_SEGMENTS),
    };
  }
  return current;
}

function buildDossierPayload(input: StoryScriptInput) {
  return {
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
  };
}

const defaultStoryModel: StoryScriptModel = async ({ system, user, schemaName, schema }) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured; story generation cannot run.");
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.STORY_MODEL ?? process.env.RESEARCH_MODEL ?? "gpt-5-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
  }, { timeout: STORY_TIMEOUT_MS, maxRetries: STORY_MAX_RETRIES });
  return JSON.parse(response.output_text);
};

export function sanitizeStoryScript(script: StoryScript, validSourceIds: Set<string>): StoryScript {
  return {
    hook: cleanText(script.hook),
    segments: sanitizeSegments(script.segments, validSourceIds),
    closingLine: cleanText(script.closingLine),
    disclaimer: cleanText(script.disclaimer),
  };
}

function sanitizeSegments(segments: StoryScriptSegment[], validSourceIds: Set<string>): StoryScriptSegment[] {
  return segments.map((segment) => ({
    heading: cleanText(segment.heading),
    narration: cleanText(segment.narration),
    sourceIds: unique(segment.sourceIds.filter((sourceId) => validSourceIds.has(sourceId))),
  })).filter((segment) => segment.heading && segment.narration);
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
