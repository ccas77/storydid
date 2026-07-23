import { z } from "zod";
import { AppError, structuredCall } from "@/lib/openai-call";

export type ListedEvent = { title: string; year: string; summary: string; searchQuery: string };

const eventSchema = z.object({
  title: z.string(),
  year: z.string(),
  summary: z.string(),
  searchQuery: z.string(),
});

const listSchema = z.object({ events: z.array(eventSchema) });

// NOTE: no minItems/maxItems here — OpenAI's strict structured-output validator rejects
// schemas with unsupported array constraints, which kills every call with a 400. Counts
// are enforced in the prompt and in code instead.
const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["events"],
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "year", "summary", "searchQuery"],
        properties: {
          title: { type: "string" },
          year: { type: "string" },
          summary: { type: "string" },
          searchQuery: { type: "string" },
        },
      },
    },
  },
} as const;

/**
 * Turn a broad theme into a list of real, specific, well-documented events the app can
 * then research and write up — so the user doesn't have to know the history themselves.
 */
export async function listEvents(theme: string, opts: { count?: number; exclude?: string[] } = {}): Promise<ListedEvent[]> {
  const count = Math.min(30, Math.max(4, opts.count ?? 16));
  const exclude = (opts.exclude ?? []).slice(0, 60);

  const raw = await structuredCall({
    schemaName: "event_list",
    schema: jsonSchema,
    preferredModel: process.env.RESEARCH_MODEL,
    timeoutMs: 60_000,
    system: [
      "You are a historian's research assistant.",
      "Given a theme, list real, specific, well-documented historical events or cases that fit it.",
      "Every item must be a REAL event with a recognizable name and a year or short year range. Never invent events.",
      "Prefer events likely to have newspaper or archival coverage.",
      "For each event give a neutral one-sentence summary and a focused search query — key names, place, and year — suitable for searching the Library of Congress and Internet Archive.",
      `Return between 4 and ${count} distinct events — as many as the theme genuinely supports, aiming for ${count}.`,
      exclude.length ? `Do NOT include any of these already-listed events: ${exclude.join("; ")}.` : "",
    ].filter(Boolean).join(" "),
    user: theme,
  });

  const parsed = listSchema.parse(raw);
  const events = parsed.events.slice(0, count);
  if (events.length < 3 && !exclude.length) {
    throw new AppError("no-events", `The model returned only ${events.length} events for this theme.`);
  }
  return events;
}
