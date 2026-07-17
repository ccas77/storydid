import { configuredEnvValue } from "./research/runtime";

export function isAuthorizedResearchRequest(request: Request) {
  const cronSecret = configuredEnvValue(process.env.CRON_SECRET);
  const authorization = request.headers.get("authorization");
  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}
