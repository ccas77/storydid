import OpenAI from "openai";

// A classified failure the UI can explain in plain language instead of a generic
// "something went wrong". `kind` doubles as the notice query param.
export class AppError extends Error {
  kind: string;
  constructor(kind: string, message: string) {
    super(message);
    this.kind = kind;
  }
}

export function classifyOpenAIError(error: unknown): AppError {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message : String(error);
  if (status === 401 || status === 403) return new AppError("openai-auth", `OpenAI rejected the API key (${status}): ${message}`);
  if (status === 429 && /quota|billing|insufficient/i.test(message)) return new AppError("openai-quota", `OpenAI quota/billing limit reached: ${message}`);
  if (status === 429) return new AppError("openai-rate", `OpenAI rate limit hit: ${message}`);
  if (status === 404 || /model/i.test(message) && status === 400) return new AppError("openai-model", `The configured model was rejected: ${message}`);
  if (status === 400) return new AppError("openai-bad-request", `OpenAI rejected the request (400): ${message}`);
  return new AppError("openai-error", message);
}

function modelCandidates(preferred?: string) {
  return Array.from(new Set([
    preferred,
    process.env.RESEARCH_MODEL,
    "gpt-5-mini",
    "gpt-4.1-mini",
  ].filter((model): model is string => Boolean(model))));
}

/**
 * One structured-output call with strict JSON schema, trying fallback models when the
 * configured one is rejected. Auth/quota failures are not retried on other models —
 * a different model cannot fix a dead key.
 */
export async function structuredCall(request: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  preferredModel?: string;
  timeoutMs?: number;
}): Promise<unknown> {
  if (!process.env.OPENAI_API_KEY) {
    throw new AppError("openai-auth", "OPENAI_API_KEY is not configured in this deployment.");
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const models = modelCandidates(request.preferredModel);
  let lastError: AppError | undefined;

  for (const model of models) {
    try {
      const response = await client.responses.create({
        model,
        input: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        text: {
          format: {
            type: "json_schema",
            name: request.schemaName,
            strict: true,
            schema: request.schema,
          },
        },
      }, { timeout: request.timeoutMs ?? 120_000, maxRetries: 1 });
      return JSON.parse(response.output_text);
    } catch (error) {
      lastError = classifyOpenAIError(error);
      // Only a model-related rejection can be cured by trying the next model.
      if (lastError.kind !== "openai-model") throw lastError;
    }
  }
  throw lastError ?? new AppError("openai-error", "No model candidates available.");
}
