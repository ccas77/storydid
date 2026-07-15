export function isAuthorizedResearchRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const ownerCode = process.env.RESEARCH_ACCESS_CODE;
  const authorization = request.headers.get("authorization");
  const ownerHeader = request.headers.get("x-research-access-code");
  return Boolean(
    (cronSecret && authorization === `Bearer ${cronSecret}`) ||
    (ownerCode && ownerHeader === ownerCode)
  );
}
