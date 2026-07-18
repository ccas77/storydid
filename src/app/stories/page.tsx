import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { stories } from "@/db/schema";
import { isCitedDossier, isCompletedStory, uniqueEditorialStories } from "@/lib/research/display";

export const dynamic = "force-dynamic";

export default async function DossiersPage() {
  const db = getDb();
  if (db) await ensureResearchSchema();
  const rows = db ? await db.select().from(stories).orderBy(desc(stories.createdAt)).limit(100).catch(() => []) : [];
  const dossiers = uniqueEditorialStories(rows.filter((story) => isCitedDossier(story) || isCompletedStory(story)));
  const completedCount = dossiers.filter(isCompletedStory).length;

  return <main className="shell">
    <header className="top">
      <div>
        <div className="brand">StoryDid</div>
        <div className="sub">Fully-researched dossiers. Open one to read or generate its finished 2000-word story.</div>
      </div>
      <nav className="nav"><Link href="/">Home</Link> <Link href="/activity">Activity</Link></nav>
    </header>

    <section className="section-head">
      <div>
        <p className="eyebrow">Dossiers</p>
        <h1>Researched stories</h1>
      </div>
      <span className="count">{dossiers.length} dossiers · {completedCount} completed</span>
    </section>

    {dossiers.length ? <section className="grid">
      {dossiers.map((story) => {
        const status = statusFor(story);
        return <Link className="card" href={`/stories/${story.id}`} key={story.id}>
          <div className="meta">
            <span className={`pill ${status.tone}`}>{status.label}</span>
            <span className="pill">{story.category}</span>
            <span className="pill">{story.eventDate ?? "Date unknown"}</span>
            <span className="pill">{story.location ?? "Location unknown"}</span>
          </div>
          <h2>{story.workingTitle}</h2>
          <p>{story.summary}</p>
        </Link>;
      })}
    </section> : <div className="empty">
      <h2>No researched dossiers yet</h2>
      <p>Submit a research brief on the <Link href="/">home page</Link>, or let the scheduled research cycle run. Fully-researched dossiers will appear here, each ready to generate a finished story.</p>
    </div>}
  </main>;
}

function statusFor(story: { scriptStatus?: string | null } & Parameters<typeof isCompletedStory>[0]) {
  if (isCompletedStory(story)) return { label: "Completed story", tone: "ok" };
  if (story.scriptStatus === "generating") return { label: "Generating…", tone: "" };
  if (story.scriptStatus === "failed") return { label: "Generation failed", tone: "warn" };
  return { label: "Ready to generate", tone: "" };
}
