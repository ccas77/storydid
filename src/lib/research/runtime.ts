export type ResearchRuntimeDiagnostics = {
  databaseUrlConfigured: boolean;
  openAiKeyConfigured: boolean;
  cronSecretConfigured: boolean;
  canRunPipeline: boolean;
  canTriggerProtectedRunner: boolean;
  missing: string[];
};

export function configuredEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized === "\"\"" || normalized === "''") return undefined;
  return normalized;
}

export function researchRuntimeDiagnostics(env: NodeJS.ProcessEnv = process.env): ResearchRuntimeDiagnostics {
  const databaseUrlConfigured = Boolean(configuredEnvValue(env.DATABASE_URL));
  const openAiKeyConfigured = Boolean(configuredEnvValue(env.OPENAI_API_KEY));
  const cronSecretConfigured = Boolean(configuredEnvValue(env.CRON_SECRET));
  const missing = [
    databaseUrlConfigured ? undefined : "DATABASE_URL",
    openAiKeyConfigured ? undefined : "OPENAI_API_KEY",
    cronSecretConfigured ? undefined : "CRON_SECRET",
  ].filter((key): key is string => Boolean(key));

  return {
    databaseUrlConfigured,
    openAiKeyConfigured,
    cronSecretConfigured,
    canRunPipeline: databaseUrlConfigured && openAiKeyConfigured,
    canTriggerProtectedRunner: cronSecretConfigured,
    missing,
  };
}
