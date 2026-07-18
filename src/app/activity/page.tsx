import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { researchActivity } from "@/db/schema";

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
  const rows = db ? await db.select().from(researchActivity).orderBy(desc(researchActivity.createdAt)).limit(200).catch(() => []) : [];
  const events = rows.filter((event) => SHOWN[event.kind]).slice(0, 30);

  return <main className="shell">
    <header className="top">
      <div>
        <Link href="/" className="back">← Home</Link>
        <h1>Activity</h1>
        <p className="lede">A plain-language record of what the research agent has finished. Behind the scenes it also searches and filters archives every few minutes; that operational detail is kept off this page.</p>
      </div>
      <nav className="nav"><Link href="/stories">Dossiers</Link></nav>
    </header>

    <section className="timeline">
      {events.length ? events.map((event) => {
        const shown = SHOWN[event.kind];
        const storyId = typeof event.metadata?.storyId === "string" ? event.metadata.storyId : undefined;
        return <article className="event" key={event.id}>
          <div className={`event-kind ${shown.tone ?? ""}`}>{shown.label}</div>
          <div>
            <h2>{event.title}</h2>
            <p>{event.detail}</p>
            <time>{event.createdAt.toLocaleString()}</time>
            {storyId ? <p><Link className="secondary" href={`/stories/${storyId}`}>Open story</Link></p> : null}
          </div>
        </article>;
      }) : <div className="empty">
        <h2>Nothing to report yet</h2>
        <p>Submit a research brief on the <Link href="/">home page</Link>. When a dossier is researched and a story is written, it will show up here and under <Link href="/stories">Dossiers</Link>.</p>
      </div>}
    </section>
  </main>;
}
