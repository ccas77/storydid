import test from "node:test";
import assert from "node:assert/strict";
import { AppError, classifyOpenAIError } from "../src/lib/openai-call";

function withStatus(status: number, message: string) {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

test("classifyOpenAIError maps statuses to user-explainable kinds", () => {
  assert.equal(classifyOpenAIError(withStatus(401, "bad key")).kind, "openai-auth");
  assert.equal(classifyOpenAIError(withStatus(403, "forbidden")).kind, "openai-auth");
  assert.equal(classifyOpenAIError(withStatus(429, "You exceeded your current quota")).kind, "openai-quota");
  assert.equal(classifyOpenAIError(withStatus(429, "Rate limit reached")).kind, "openai-rate");
  assert.equal(classifyOpenAIError(withStatus(404, "The model `x` does not exist")).kind, "openai-model");
  assert.equal(classifyOpenAIError(withStatus(400, "The requested model was not found")).kind, "openai-model");
  assert.equal(classifyOpenAIError(withStatus(400, "Invalid schema for response_format")).kind, "openai-bad-request");
  assert.equal(classifyOpenAIError(new Error("socket hang up")).kind, "openai-error");
});

test("AppError carries its kind", () => {
  const error = new AppError("no-sources", "only 1 record");
  assert.equal(error.kind, "no-sources");
  assert.match(error.message, /1 record/);
});
