import test from "node:test";
import assert from "node:assert/strict";
import { configuredEnvValue, researchRuntimeDiagnostics } from "../src/lib/research/runtime";

test("configuredEnvValue treats blank and quoted-empty values as missing", () => {
  assert.equal(configuredEnvValue(undefined), undefined);
  assert.equal(configuredEnvValue(""), undefined);
  assert.equal(configuredEnvValue("   "), undefined);
  assert.equal(configuredEnvValue("\"\""), undefined);
  assert.equal(configuredEnvValue("''"), undefined);
  assert.equal(configuredEnvValue("real-value"), "real-value");
});

test("researchRuntimeDiagnostics reports missing autonomous pipeline credentials", () => {
  const diagnostics = researchRuntimeDiagnostics({
    DATABASE_URL: "\"\"",
    OPENAI_API_KEY: "sk-test",
    CRON_SECRET: "",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(diagnostics.databaseUrlConfigured, false);
  assert.equal(diagnostics.openAiKeyConfigured, true);
  assert.equal(diagnostics.cronSecretConfigured, false);
  assert.equal(diagnostics.canRunPipeline, false);
  assert.equal(diagnostics.canTriggerProtectedRunner, false);
  assert.deepEqual(diagnostics.missing, ["DATABASE_URL", "CRON_SECRET"]);
});
