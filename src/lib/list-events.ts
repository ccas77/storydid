import OpenAI from "openai";
import { z } from "zod";

export type ListedEvent = { title: string; year: string; summary: string; searchQuery: string };

const eventSchema = z.object({
  title: z.string(),
  year: z.string(),
  summary: z.string(),
  searchQuery: z.string(),
});

const listSchema = z.object({ events: z.array(eventSchema) });

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["events"],
  properties: {
    events: {
      type: "array",
      minItems: 4,
      maxItems: 30,
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
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured; cannot list events.");
  const count = Math.min(30, Math.max(4, opts.count ?? 16));
  const exclude = (opts.exclude ?? []).slice(0, 60);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.RESEARCH_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content: [
          "You are a historian's research assistant.",
          "Given a theme, list real, specific, well-documented historical events or cases that fit it.",
          "Every item must be a REAL event with a recognizable name and a year or short year range. Never invent events.",
          "Prefer events likely to have newspaper or archival coverage.",
          "For each event give a neutral one-sentence summary and a focused search query — key names, place, and year — suitable for searching the Library of Congress and Internet Archive.",
          `Return about ${count} distinct events (as many as the theme genuinely supports).`,
          exclude.length ? `Do NOT include any of these already-listed events: ${exclude.join("; ")}.` : "",
        ].filter(Boolean).join(" "),
      },
      { role: "user", content: theme },
    ],
    text: { format: { type: "json_schema", name: "event_list", strict: true, schema: jsonSchema } },
  }, { timeout: 60_000, maxRetries: 2 });

  const parsed = listSchema.parse(JSON.parse(response.output_text));
  return parsed.events.slice(0, count);
}
