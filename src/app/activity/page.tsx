import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { researchActivity, stories } from "@/db/schema";

export const dynamic = "force-dynamic";

// Only surface the handful of events a person actually cares about. Everything else
// (per-record rejections, merges, stage budgets, follow-up searches) is operational noise.
const SHOWN: Record<string, { label: string; tone?: string }> = {
  brief_queued: { label: "Brief queued" },
  story_generated: { label: "Finished story written", tone: "ok" },
  dossier: { label: "New dossier ready", tone: "ok" },
  story_generation_failed: { label: "Story generation issue", tone: "warn" },
  error: { label: "Something went wrong", tone: "warn" },
};

export default async function ActivityPage() {
  const db = getDb();
  if (db) await ensureResearchSchema();
  const rows = db ? await db.select().from(researchActivity).orderBy(desc(researchActivity.createdAt)).limit(300).catch(() => []) : [];
  const storyRows = db ? await db.select({ id: stories.id, title: stories.workingTitle }).from(stories).catch(() => []) : [];
  const titleById = new Map(storyRows.map((story) => [story.id, story.title.trim().toLowerCase()]));

  // Collapse the historical log: one entry per real story (the pipeline re-ran the same
  // story many times), drop events whose story has since been cleaned up, and de-duplicate
  // otherwise-identical lines. This is a live view, not a raw audit trail.
  const seen = new Set<string>();
  const events: Array<{ id: string; label: string; tone?: string; title: string; detail: string; at: Date; storyId?: string }> = [];
  for (const event of rows) {
    const shown = SHOWN[event.kind];
    if (!shown) continue;
    const storyId = typeof event.metadata?.storyId === "string" ? event.metadata.storyId : undefined;
    let key: string;
    if (storyId) {
      const title = titleById.get(storyId);
      if (!title) continue; // story was removed in cleanup — drop its stale log lines
      key = `story:${title}`;
    } else {
      key = `${event.kind}:${event.detail}`;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({ id: event.id, label: shown.label, tone: shown.tone, title: event.title, detail: event.detail, at: event.createdAt, storyId: storyId && titleById.has(storyId) ? storyId : undefined });
    if (events.length >= 25) break;
  }

  return <main className="shell">
    <header className="top">
      <div>
        <Link href="/" className="back">← Home</Link>
        <h1>Activity</h1>
        <p className="lede">A plain-language record of what the research agent has finished — one entry per story. Behind the scenes it also searches and filters archives every few minutes; that operational detail is kept off this page.</p>
      </div>
      <nav className="nav"><Link href="/stories">Dossiers</Link></nav>
    </header>

    <section className="timeline">
      {events.length ? events.map((event) => <article className="event" key={event.id}>
        <div className={`event-kind ${event.tone ?? ""}`}>{event.label}</div>
        <div>
          <h2>{event.title}</h2>
          <p>{event.detail}</p>
          <time>{event.at.toLocaleString()}</time>
          {event.storyId ? <p><Link className="secondary" href={`/stories/${event.storyId}`}>Open story</Link></p> : null}
        </div>
      </article>) : <div className="empty">
        <h2>Nothing to report yet</h2>
        <p>Submit a research brief on the <Link href="/">home page</Link>. When a dossier is researched and a story is written, it will show up here and under <Link href="/stories">Dossiers</Link>.</p>
      </div>}
    </section>
  </main>;
}
