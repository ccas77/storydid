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
  "You are an accomplished narrative-nonfiction writer.",
  "Write a vivid, accurate, engaging longform article about ONE specific historical event for a smart general reader who has never heard of it and has not yet decided to care.",
  "Open in the moment — a concrete scene, real people, real stakes — and earn the reader's attention in the first paragraph. Then tell what happened, to whom, why, and why it still matters.",
  "Write about the EVENT itself. Never write about archives, collections, 'the documentary record', finding aids, or how historians study the event. The reader wants the story, not a description of sources.",
  "Be historically accurate and specific. You may draw on well-established facts about this event from the historical record. Do not invent quotations, statistics, or names you are not confident are correct; when a precise figure is uncertain, use careful wording.",
  "The supplied archive records are references that support the article — attach a record's source ID to a section it backs. Sections of well-known general narrative may cite nothing; that is fine.",
  "Write flowing narrative prose in full paragraphs. Never output links, URLs, markdown, bullet lists, raw citation codes such as '(loc:...)' or 'internet_archive:...', placeholders, or commentary about sources.",
  "Every section heading names a distinct stage of the story. No two sections may cover the same ground or repeat a heading.",
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
        `Write a complete article of about ${PUBLISH_READY_TARGET_WORDS} words (between ${PUBLISH_READY_MIN_WORDS} and ${PUBLISH_READY_MAX_WORDS}).`,
        `Open with a gripping hook, then write ${MIN_SEGMENTS} to 11 sections of roughly 200-280 words. Each section is a distinct stage of the story with its own heading; no two may overlap.`,
        "Assume the reader knows nothing about this event. Lead with the human story and concrete detail; give background only as the story needs it.",
        "End with a short closing line and, only if a genuine caveat exists, a one-sentence note. Do not list sources or mention the archive.",
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
          `The article is ${words} words and should reach about ${PUBLISH_READY_TARGET_WORDS}; add roughly ${deficit} more words.`,
          "Write only genuinely NEW sections that move the story forward into ground not yet covered — later developments, consequences, specific people, the aftermath, or the legacy.",
          `Do NOT repeat, paraphrase, or reuse any of these already-written section headings or their topics: ${current.segments.map((segment) => segment.heading).join("; ")}.`,
          "Keep writing about the event itself, not about sources or archives. Do not restate the hook.",
        ],
      }),
    });

    const seenHeadings = new Set(current.segments.map((segment) => normalizeHeading(segment.heading)));
    const extra = sanitizeSegments(expansionSchema.parse(raw).segments, validSourceIds)
      .filter((segment) => !seenHeadings.has(normalizeHeading(segment.heading)));
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
  const seen = new Set<string>();
  const segments = sanitizeSegments(script.segments, validSourceIds).filter((segment) => {
    const key = normalizeHeading(segment.heading);
    if (seen.has(key)) return false; // drop duplicate/repeated sections
    seen.add(key);
    return true;
  });
  return {
    hook: cleanText(script.hook),
    segments,
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

function normalizeHeading(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
  return value
    // Strip leaked citation codes the model sometimes writes into prose, e.g.
    // "(loc:http://lccn.loc.gov/...)" or "internet_archive:foo; loc:bar".
    .replace(/\((?:\s*(?:loc|internet_archive)\s*:[^)]*)\)/gi, " ")
    .replace(/\b(?:loc|internet_archive)\s*:\s*\S+/gi, " ")
    .replace(/\(\s*[;,]?\s*\)/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
