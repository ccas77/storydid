export type Notice = { tone: "success" | "error"; eyebrow: string; title: string; detail: string };

// One plain-language explanation per failure kind, shared by every page. The point is
// that the app itself always tells you exactly what went wrong and what to do about it.
const NOTICES: Record<string, Notice> = {
  "openai-auth": { tone: "error", eyebrow: "OpenAI key problem", title: "OpenAI rejected the API key.", detail: "Check OPENAI_API_KEY in the Vercel project settings — it may be missing, revoked, or pasted incorrectly — then redeploy." },
  "openai-quota": { tone: "error", eyebrow: "OpenAI out of credit", title: "The OpenAI account has hit its quota or billing limit.", detail: "Add credit or raise the limit at platform.openai.com/billing, then try again." },
  "openai-rate": { tone: "error", eyebrow: "Rate limited", title: "OpenAI rate-limited the request.", detail: "Wait a minute and try again." },
  "openai-model": { tone: "error", eyebrow: "Model unavailable", title: "The configured AI model was rejected.", detail: "The RESEARCH_MODEL / STORY_MODEL value in Vercel may be outdated. Clear it to use the default, or set a current model name." },
  "openai-bad-request": { tone: "error", eyebrow: "Request rejected", title: "OpenAI rejected the request format.", detail: "This is an app bug, not your setup — the exact error is recorded on the Activity page." },
  "openai-error": { tone: "error", eyebrow: "OpenAI error", title: "The AI call failed unexpectedly.", detail: "Try again in a moment. The exact error is recorded on the Activity page." },
  "archives-down": { tone: "error", eyebrow: "Archives unreachable", title: "The public archives could not be reached.", detail: "The Library of Congress / Internet Archive may be down or blocking requests. Try again shortly." },
  "no-events": { tone: "error", eyebrow: "No events", title: "Couldn't find clear events for that theme.", detail: "Try a broader or more historical framing — an era plus a subject, like '19th century mining disasters'." },
  "list-failed": { tone: "error", eyebrow: "Couldn't build the list", title: "Something went wrong finding events.", detail: "Try again in a moment. The exact error is recorded on the Activity page." },
  "no-sources": { tone: "error", eyebrow: "No sources found", title: "The archives didn't have enough on that event.", detail: "Pick a different event — archival coverage varies a lot between them." },
  "write-failed": { tone: "error", eyebrow: "Couldn't finish", title: "Something went wrong while writing.", detail: "Try again in a moment. The exact error is recorded on the Activity page." },
  "no-more": { tone: "success", eyebrow: "That's the list", title: "No new events to add.", detail: "The model didn't find more distinct events for this theme." },
  "topic-too-short": { tone: "error", eyebrow: "Add a little more", title: "The topic needs a few more words.", detail: "Use at least a few descriptive words so there's enough to work with." },
  "missing-db": { tone: "error", eyebrow: "Not configured", title: "The database isn't connected.", detail: "Set DATABASE_URL in the Vercel project and redeploy." },
};

export function noticeFrom(kind: string | undefined): Notice | undefined {
  return kind ? NOTICES[kind] : undefined;
}
