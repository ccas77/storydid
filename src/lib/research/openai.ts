import OpenAI from "openai";
import { z } from "zod";
import type { ArchiveRecord, StoryDossier } from "@/lib/types";

const dossierSchema = z.object({
  stories: z.array(z.object({
    workingTitle: z.string(), category: z.string(), summary: z.string(), eventDate: z.string().nullable().optional(), location: z.string().nullable().optional(),
    scores: z.object({ interest: z.number().min(0).max(100), sources: z.number().min(0).max(100), competition: z.number().min(0).max(100), confidence: z.number().min(0).max(100) }),
    chronology: z.array(z.object({ date: z.string(), event: z.string() })),
    keyFacts: z.array(z.string()), conflicts: z.array(z.string()), titles: z.array(z.string()),
    outline: z.array(z.object({ heading: z.string(), notes: z.string() })), sourceIds: z.array(z.string())
  })).max(5)
});

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function buildDossiers(records: ArchiveRecord[]): Promise<StoryDossier[]> {
  const client = getOpenAI();
  if (!client) return demoDossiers(records);
  const compact = records.slice(0, 60).map(({ id, title, url, date, location, description, source }) => ({ id, title, url, date, location, description: description?.slice(0, 1500), source }));
  const response = await client.responses.create({
    model: process.env.RESEARCH_MODEL ?? "gpt-5-mini",
    input: [
      { role: "system", content: "You are a historical research editor. Identify up to 3 coherent, verifiable story candidates from archive metadata. Never invent facts. Treat newspaper allegations as allegations. Use only supplied records. Score competition inversely: 100 means unusually low direct competition. Return JSON only." },
      { role: "user", content: JSON.stringify(compact) }
    ],
    text: { format: { type: "json_schema", name: "story_dossiers", strict: true, schema: {
      type: "object", additionalProperties: false, required: ["stories"], properties: { stories: { type: "array", maxItems: 5, items: {
        type: "object", additionalProperties: false,
        required: ["workingTitle","category","summary","eventDate","location","scores","chronology","keyFacts","conflicts","titles","outline","sourceIds"],
        properties: {
          workingTitle:{type:"string"}, category:{type:"string"}, summary:{type:"string"}, eventDate:{type:["string","null"]}, location:{type:["string","null"]},
          scores:{type:"object",additionalProperties:false,required:["interest","sources","competition","confidence"],properties:{interest:{type:"number"},sources:{type:"number"},competition:{type:"number"},confidence:{type:"number"}}},
          chronology:{type:"array",items:{type:"object",additionalProperties:false,required:["date","event"],properties:{date:{type:"string"},event:{type:"string"}}}},
          keyFacts:{type:"array",items:{type:"string"}}, conflicts:{type:"array",items:{type:"string"}}, titles:{type:"array",items:{type:"string"}},
          outline:{type:"array",items:{type:"object",additionalProperties:false,required:["heading","notes"],properties:{heading:{type:"string"},notes:{type:"string"}}}}, sourceIds:{type:"array",items:{type:"string"}}
        }
      } } }
    } } }
  });
  const parsed = dossierSchema.parse(JSON.parse(response.output_text));
  return parsed.stories.map(({ eventDate, location, ...story }) => ({
    ...story,
    ...(eventDate ? { eventDate } : {}),
    ...(location ? { location } : {}),
  }));
}

function demoDossiers(records: ArchiveRecord[]): StoryDossier[] {
  const sample = records.slice(0, 3);
  return [{
    workingTitle: sample[0]?.title ?? "The inheritance dispute that divided a town",
    category: "Historical disputes",
    summary: "Demo dossier generated because OPENAI_API_KEY is not configured. Archive records were retrieved successfully and are ready for AI analysis.",
    eventDate: sample[0]?.date,
    location: sample[0]?.location,
    scores: { interest: 72, sources: Math.min(95, 35 + sample.length * 15), competition: 76, confidence: 45 },
    chronology: [{ date: sample[0]?.date ?? "Unknown", event: "Primary archive record located; detailed extraction pending." }],
    keyFacts: sample.map(x => x.title), conflicts: ["Automated verification requires an OpenAI API key."],
    titles: ["A Forgotten Case Hidden in the Archives", "The Dispute the Newspapers Could Not Ignore"],
    outline: [{ heading: "Discovery", notes: "Introduce the archival record and establish the setting." }, { heading: "Evidence", notes: "Compare independent reports and official records." }],
    sourceIds: sample.map(x => x.id)
  }];
}
