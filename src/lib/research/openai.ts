import OpenAI from "openai";
import { z } from "zod";
import type { ArchiveRecord, InvestigationPlan, ResearchDecisionSet, StoryDossier } from "@/lib/types";
import { evidenceDepthScore, groupSourceIndependence, originalitySignals, researchQuestionsFor, shouldDowngradeInvestigation, type InvestigationInput } from "./investigation";

const scoreSchema = z.object({
  narrativeTension: z.number().min(0).max(100),
  sourceStrength: z.number().min(0).max(100),
  originality: z.number().min(0).max(100),
  humanInterest: z.number().min(0).max(100),
  historicalConsequence: z.number().min(0).max(100),
  researchability: z.number().min(0).max(100),
});

const evidenceSchema = z.object({
  claim: z.string(),
  sourceIds: z.array(z.string()),
  note: z.string(),
});

const dossierSchema = z.object({
  category: z.string(),
  summary: z.string(),
  eventDate: z.string().nullable(),
  location: z.string().nullable(),
  chronology: z.array(z.object({ date: z.string(), event: z.string() })),
  keyFacts: z.array(z.string()),
  conflicts: z.array(z.string()),
  titles: z.array(z.string()),
  outline: z.array(z.object({ heading: z.string(), notes: z.string() })),
});

const decisionSchema = z.object({
  rejected: z.array(z.object({ title: z.string(), reason: z.string(), sourceIds: z.array(z.string()) })),
  merged: z.array(z.object({ title: z.string(), reason: z.string(), sourceIds: z.array(z.string()) })),
  recommendations: z.array(z.object({
    clusterLabel: z.string(),
    mergeKey: z.string(),
    workingTitle: z.string(),
    premise: z.string(),
    narrativeHook: z.string(),
    whyOverlooked: z.string(),
    strongestEvidence: z.array(evidenceSchema),
    originalityAssessment: z.string(),
    unresolvedRisks: z.array(z.string()),
    confidence: z.number().min(0).max(100),
    researchCompleteness: z.number().min(0).max(100),
    recommendedNextAction: z.string(),
    scores: scoreSchema,
    sourceIds: z.array(z.string()),
    followUpQueries: z.array(z.string()),
    downgradeReason: z.string().nullable(),
    shouldCreateDossier: z.boolean(),
    dossier: dossierSchema.nullable(),
  })).max(6),
});

const investigationPlanSchema = z.object({
  plans: z.array(z.object({
    candidateExternalId: z.string(),
    workingTitle: z.string(),
    premise: z.string(),
    researchQuestions: z.array(z.string()),
    followUpQueries: z.array(z.string()),
    originalitySignals: z.array(z.string()),
    evidenceDepth: z.number().min(0).max(100),
    sourceIndependence: z.array(z.object({ group: z.string(), sourceIds: z.array(z.string()) })),
    downgradeReason: z.string().nullable(),
  })),
});

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const recommendationItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "clusterLabel", "mergeKey", "workingTitle", "premise", "narrativeHook", "whyOverlooked",
    "strongestEvidence", "originalityAssessment", "unresolvedRisks", "confidence",
    "researchCompleteness", "recommendedNextAction", "scores", "sourceIds", "followUpQueries",
    "downgradeReason", "shouldCreateDossier", "dossier"
  ],
  properties: {
    clusterLabel: { type: "string" },
    mergeKey: { type: "string" },
    workingTitle: { type: "string" },
    premise: { type: "string" },
    narrativeHook: { type: "string" },
    whyOverlooked: { type: "string" },
    strongestEvidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "sourceIds", "note"],
        properties: {
          claim: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
          note: { type: "string" },
        },
      },
    },
    originalityAssessment: { type: "string" },
    unresolvedRisks: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
    researchCompleteness: { type: "number" },
    recommendedNextAction: { type: "string" },
    scores: {
      type: "object",
      additionalProperties: false,
      required: ["narrativeTension", "sourceStrength", "originality", "humanInterest", "historicalConsequence", "researchability"],
      properties: {
        narrativeTension: { type: "number" },
        sourceStrength: { type: "number" },
        originality: { type: "number" },
        humanInterest: { type: "number" },
        historicalConsequence: { type: "number" },
        researchability: { type: "number" },
      },
    },
    sourceIds: { type: "array", items: { type: "string" } },
    followUpQueries: { type: "array", items: { type: "string" } },
    downgradeReason: { type: ["string", "null"] },
    shouldCreateDossier: { type: "boolean" },
    dossier: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["category", "summary", "eventDate", "location", "chronology", "keyFacts", "conflicts", "titles", "outline"],
          properties: {
            category: { type: "string" },
            summary: { type: "string" },
            eventDate: { type: ["string", "null"] },
            location: { type: ["string", "null"] },
            chronology: { type: "array", items: { type: "object", additionalProperties: false, required: ["date", "event"], properties: { date: { type: "string" }, event: { type: "string" } } } },
            keyFacts: { type: "array", items: { type: "string" } },
            conflicts: { type: "array", items: { type: "string" } },
            titles: { type: "array", items: { type: "string" } },
            outline: { type: "array", items: { type: "object", additionalProperties: false, required: ["heading", "notes"], properties: { heading: { type: "string" }, notes: { type: "string" } } } },
          },
        },
      ],
    },
  },
};

export async function buildResearchDecisions(records: ArchiveRecord[]): Promise<ResearchDecisionSet> {
  const client = getOpenAI();
  if (!client) return demoDecisions(records);

  const compact = records.slice(0, 90).map(({ id, title, url, date, location, description, source }) => ({
    id,
    title,
    url,
    date,
    location,
    source,
    description: description?.slice(0, 1600),
  }));

  const response = await client.responses.create({
    model: process.env.RESEARCH_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content: [
          "You are StoryDid's autonomous historical research editor.",
          "Your job is to transform raw archive metadata into a tiny set of researched editorial recommendations.",
          "Cluster records that describe the same underlying event, person, dispute, trial, disaster, fraud, mystery, or controversy.",
          "Reject duplicates, weak records, ordinary institutional proceedings, routine church/business minutes, and candidates with low narrative tension.",
          "Rank remaining candidates by narrative tension, source strength, originality, human interest, historical consequence, and researchability.",
          "Decide what evidence is missing and propose follow-up searches.",
          "Downgrade investigations when the evidence remains thin.",
          "Only recommend stories that could plausibly become a compelling YouTube/Facebook historical narrative.",
          "Every evidence claim must cite supplied source IDs. Never invent facts. Treat newspaper allegations as allegations.",
          "Create a finished dossier only when confidence and research completeness are both strong."
        ].join(" ")
      },
      { role: "user", content: JSON.stringify(compact) },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "research_decisions",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["rejected", "merged", "recommendations"],
          properties: {
            rejected: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "reason", "sourceIds"],
                properties: {
                  title: { type: "string" },
                  reason: { type: "string" },
                  sourceIds: { type: "array", items: { type: "string" } },
                },
              },
            },
            merged: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "reason", "sourceIds"],
                properties: {
                  title: { type: "string" },
                  reason: { type: "string" },
                  sourceIds: { type: "array", items: { type: "string" } },
                },
              },
            },
            recommendations: { type: "array", maxItems: 6, items: recommendationItemSchema },
          },
        },
      },
    },
  });

  const parsed = decisionSchema.parse(JSON.parse(response.output_text));
  return {
    ...parsed,
    recommendations: parsed.recommendations.map(({ downgradeReason, dossier, ...recommendation }) => ({
      ...recommendation,
      ...(downgradeReason ? { downgradeReason } : {}),
      ...(dossier ? {
        dossier: {
          category: dossier.category,
          summary: dossier.summary,
          chronology: dossier.chronology,
          keyFacts: dossier.keyFacts,
          conflicts: dossier.conflicts,
          titles: dossier.titles,
          outline: dossier.outline,
          ...(dossier.eventDate ? { eventDate: dossier.eventDate } : {}),
          ...(dossier.location ? { location: dossier.location } : {}),
        },
      } : {}),
    })),
  };
}

export async function buildInvestigationPlans(candidates: InvestigationInput[]): Promise<InvestigationPlan[]> {
  const client = getOpenAI();
  if (!client) return demoInvestigationPlans(candidates);

  const response = await client.responses.create({
    model: process.env.RESEARCH_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content: [
          "You are StoryDid's investigation controller.",
          "For each candidate, decide what evidence is missing, create bounded research questions, estimate evidence depth, assess originality signals, and group independent source bases.",
          "Downgrade candidates when evidence depth or narrative signal is weak.",
          "Do not write a dossier. Do not invent facts. Only plan controlled follow-up investigation."
        ].join(" "),
      },
      { role: "user", content: JSON.stringify(candidates.slice(0, 18)) },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "investigation_plans",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["plans"],
          properties: {
            plans: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["candidateExternalId", "workingTitle", "premise", "researchQuestions", "followUpQueries", "originalitySignals", "evidenceDepth", "sourceIndependence", "downgradeReason"],
                properties: {
                  candidateExternalId: { type: "string" },
                  workingTitle: { type: "string" },
                  premise: { type: "string" },
                  researchQuestions: { type: "array", items: { type: "string" } },
                  followUpQueries: { type: "array", items: { type: "string" } },
                  originalitySignals: { type: "array", items: { type: "string" } },
                  evidenceDepth: { type: "number" },
                  sourceIndependence: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["group", "sourceIds"],
                      properties: {
                        group: { type: "string" },
                        sourceIds: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                  downgradeReason: { type: ["string", "null"] },
                },
              },
            },
          },
        },
      },
    },
  });

  const parsed = investigationPlanSchema.parse(JSON.parse(response.output_text));
  return parsed.plans.map(({ downgradeReason, ...plan }) => ({
    ...plan,
    ...(downgradeReason ? { downgradeReason } : {}),
  }));
}

export async function buildDossiers(records: ArchiveRecord[]): Promise<StoryDossier[]> {
  const decisions = await buildResearchDecisions(records);
  return decisions.recommendations
    .filter((recommendation) => recommendation.shouldCreateDossier && recommendation.dossier)
    .map((recommendation) => ({
      workingTitle: recommendation.workingTitle,
      category: recommendation.dossier?.category ?? "Historical research",
      summary: recommendation.dossier?.summary ?? recommendation.premise,
      eventDate: recommendation.dossier?.eventDate,
      location: recommendation.dossier?.location,
      scores: {
        interest: recommendation.scores.humanInterest,
        sources: recommendation.scores.sourceStrength,
        competition: recommendation.scores.originality,
        confidence: recommendation.confidence,
      },
      chronology: recommendation.dossier?.chronology ?? [],
      keyFacts: recommendation.dossier?.keyFacts ?? recommendation.strongestEvidence.map((evidence) => evidence.claim),
      conflicts: recommendation.dossier?.conflicts ?? recommendation.unresolvedRisks,
      titles: recommendation.dossier?.titles ?? [recommendation.workingTitle],
      outline: recommendation.dossier?.outline ?? [],
      sourceIds: recommendation.sourceIds,
    }));
}

function demoDecisions(records: ArchiveRecord[]): ResearchDecisionSet {
  const sample = records.slice(0, 3);
  return {
    rejected: [],
    merged: [],
    recommendations: [{
      clusterLabel: "Demo archive lead",
      mergeKey: "demo-archive-lead",
      workingTitle: sample[0]?.title ?? "The inheritance dispute that divided a town",
      premise: "Demo recommendation generated because OPENAI_API_KEY is not configured.",
      narrativeHook: "A promising archival lead is ready for deeper source-backed investigation.",
      whyOverlooked: "The story is buried in metadata-level archive records and has not yet been developed for a popular audience.",
      strongestEvidence: sample.map((record) => ({ claim: record.title, sourceIds: [record.id], note: record.description ?? "Archive metadata located." })),
      originalityAssessment: "Likely under-covered until source clustering and title searches are completed.",
      unresolvedRisks: ["Automated verification requires an OpenAI API key."],
      confidence: 45,
      researchCompleteness: 35,
      recommendedNextAction: "Investigate further",
      scores: { narrativeTension: 65, sourceStrength: Math.min(95, 35 + sample.length * 15), originality: 76, humanInterest: 72, historicalConsequence: 50, researchability: 58 },
      sourceIds: sample.map((record) => record.id),
      followUpQueries: sample[0] ? [sample[0].title] : [],
      shouldCreateDossier: false,
    }],
  };
}

function demoInvestigationPlans(candidates: InvestigationInput[]): InvestigationPlan[] {
  return candidates.map((candidate) => {
    const downgradeReason = shouldDowngradeInvestigation(candidate);
    return {
      candidateExternalId: candidate.externalId,
      workingTitle: candidate.title,
      premise: candidate.hypothesis,
      researchQuestions: researchQuestionsFor(candidate),
      followUpQueries: [`"${candidate.title}" testimony`, `"${candidate.title}" newspaper`, `"${candidate.title}" archive`],
      originalitySignals: originalitySignals(candidate),
      evidenceDepth: Math.round(evidenceDepthScore(candidate)),
      sourceIndependence: groupSourceIndependence(candidate.evidenceSourceIds),
      ...(downgradeReason ? { downgradeReason } : {}),
    };
  });
}
