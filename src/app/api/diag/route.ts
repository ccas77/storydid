import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { researchActivity } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Safe self-diagnostics: config presence (booleans only), connectivity checks, and the
// most recent recorded errors. No secrets and no paid API calls, so it is fine to expose.
export async function GET() {
  const db = getDb();
  let dbOk = false;
  let recentErrors: Array<{ title: string; detail: string; at: string }> = [];
  if (db) {
    try {
      await ensureResearchSchema();
      const rows = await db.select().from(researchActivity)
        .where(eq(researchActivity.kind, "error"))
        .orderBy(desc(researchActivity.createdAt)).limit(5);
      dbOk = true;
      recentErrors = rows.map((row) => ({ title: row.title, detail: row.detail, at: row.createdAt.toISOString() }));
    } catch {
      dbOk = false;
    }
  }

  const [loc, ia] = await Promise.all([
    probe("https://www.loc.gov/search/?q=test&fo=json&c=1"),
    probe("https://archive.org/advancedsearch.php?q=test&rows=1&output=json"),
  ]);

  return Response.json({
    env: {
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      RESEARCH_MODEL: process.env.RESEARCH_MODEL ?? "(default: gpt-5-mini)",
      STORY_MODEL: process.env.STORY_MODEL ?? "(default: research model)",
    },
    database: dbOk ? "ok" : "unreachable",
    archives: { libraryOfCongress: loc, internetArchive: ia },
    recentErrors,
  });
}

async function probe(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    return response.ok ? "ok" : `http ${response.status}`;
  } catch (error) {
    return `failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
