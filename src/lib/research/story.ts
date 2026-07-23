import { z } from "zod";
import { structuredCall } from "../openai-call";
import { PUBLISH_READY_MAX_WORDS, PUBLISH_READY_MIN_WORDS, PUBLISH_READY_TARGET_WORDS } from "./story-length";
import type { StoryScript, StoryScriptInput, StoryScriptSegment } from "@/lib/types";

const MAX_EXPANSION_ROUNDS = 8;
const STORY_TIMEOUT_MS = 120_000;
const MIN_SEGMENTS = 6;
const MAX_SEGMENTS = 26;

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

// NOTE: no minItems/maxItems in these strict schemas — OpenAI's structured-output
// validator rejects unsupported array constraints with a 400 on every call. Segment
// counts are steered by the prompt and enforced by code (slice/dedupe) instead.
const scriptJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hook", "segments", "closingLine", "disclaimer"],
  properties: {
    hook: { type: "string" },
    segments: { type: "array", items: segmentJsonSchema },
    closingLine: { type: "string" },
    disclaimer: { type: "string" },
  },
} as const;

const expansionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["segments"],
  properties: {
    segments: { type: "array", items: segmentJsonSchema },
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
        `Write the complete story at the length the event genuinely deserves — a large, complex scandal may need ${PUBLISH_READY_TARGET_WORDS}-${PUBLISH_READY_MAX_WORDS} words; a more contained one ${PUBLISH_READY_MIN_WORDS}-2400. Never pad, but do not cut the story short. Write at least ${PUBLISH_READY_MIN_WORDS} words.`,
        `Open with a gripping hook, then write ${MIN_SEGMENTS} or more sections of roughly 220-300 words. Each section is a distinct stage of the story with its own heading; no two may overlap.`,
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

const REVIEW_PROMPT = (subject: string) => [
  `You are a meticulous historian and copy editor reviewing an article about ${subject}.`,
  "Correct any historical inaccuracy. Remove or soften any specific claim — a number, date, name, place, or quotation — that is not well-established, verifiable history; replace it with accurate, more general wording rather than cutting the narrative.",
  "Do not add new specific facts, statistics, or quotations, and do not invent anything.",
  "Keep the engaging narrative voice, keep every section heading, and keep roughly the same length. Do not write about sources or archives.",
  "Return the corrected article in the same structure, preserving each section's sourceIds array exactly as given.",
].join(" ");

/**
 * A second pass that fact-checks and corrects the draft: it fixes inaccuracies and softens
 * shaky specifics. It is best-effort — on any problem, or if the correction comes back
 * shorter or uncited, it keeps the original draft so the check can never make things worse.
 */
export async function verifyStoryScript(
  script: StoryScript,
  subject: string,
  validSourceIds: Set<string>,
  model: StoryScriptModel = defaultStoryModel,
): Promise<StoryScript> {
  try {
    const raw = await model({
      system: REVIEW_PROMPT(subject),
      schemaName: "story_review",
      schema: scriptJsonSchema,
      user: JSON.stringify({ article: script }),
    });
    const corrected = reattachCitations(sanitizeStoryScript(scriptSchema.parse(raw), validSourceIds), script);
    // Accept a modest trim (the check removes shaky specifics) but reject a gutted result.
    const longEnough = wordCount(corrected) >= Math.round(wordCount(script) * 0.85);
    const hasCitations = corrected.segments.some((segment) => segment.sourceIds.length > 0);
    if (corrected.segments.length >= 3 && longEnough && hasCitations) return corrected;
    return script;
  } catch {
    return script;
  }
}

// Keep citations if the review pass dropped a section's sourceIds — carry over the
// original section's citations by position.
function reattachCitations(corrected: StoryScript, original: StoryScript): StoryScript {
  return {
    ...corrected,
    segments: corrected.segments.map((segment, index) => segment.sourceIds.length ? segment : { ...segment, sourceIds: original.segments[index]?.sourceIds ?? [] }),
  };
}

/**
 * Keeps requesting additional source-grounded segments until the article clears the
 * word floor. Appending segments only ever increases length, so this converges as
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
    // Only fill up to the floor — the draft already self-sized to the event, so we don't
    // pad a well-formed article; we only rescue one that came back short.
    if (words >= PUBLISH_READY_MIN_WORDS || current.segments.length >= MAX_SEGMENTS) break;

    const deficit = PUBLISH_READY_MIN_WORDS - words;
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
          `The article is ${words} words and should reach at least ${PUBLISH_READY_MIN_WORDS}; add roughly ${deficit} more words.`,
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
  return structuredCall({
    system,
    user,
    schemaName,
    schema,
    preferredModel: process.env.STORY_MODEL ?? process.env.RESEARCH_MODEL,
    timeoutMs: STORY_TIMEOUT_MS,
  });
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
