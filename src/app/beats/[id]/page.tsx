import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { beats, stories } from "@/db/schema";
import { isCitedDossier, uniqueEditorialStories } from "@/lib/research/display";

export const dynamic = "force-dynamic";

export default async function BeatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (!db) notFound();
  await ensureResearchSchema();
  const [beat] = await db.select().from(beats).where(eq(beats.slug, id)).limit(1);
  if (!beat) notFound();

  const rawDossiers = await db.select().from(stories).where(eq(stories.beatId, beat.id)).orderBy(desc(stories.createdAt)).limit(16).catch(() => []);
  const storyRows = uniqueEditorialStories(rawDossiers.filter(isCitedDossier)).slice(0, 6);

  return <main className="shell">
    <header className="top">
      <div>
        <Link href="/" className="back">← Newsroom</Link>
        <h1>{beat.name}</h1>
        <p className="lede">{beat.description}</p>
      </div>
      <nav className="nav"><Link href="/activity">Activity</Link></nav>
    </header>

    <section className="section-head">
      <div>
        <p className="eyebrow">Ready to read</p>
        <h1>Stories</h1>
      </div>
      <span className="count">{storyRows.length} ready</span>
    </section>
    <section className="grid">
      {storyRows.map((story) => <Link className="card success-card story-card" href={`/stories/${story.id}`} key={story.id}>
        <h2>{story.workingTitle}</h2>
        <p>{story.summary}</p>
        <span className="secondary inline-link">Read story</span>
      </Link>)}
      {!storyRows.length ? <div className="empty"><h2>No stories ready yet</h2><p>Nothing from this brief has passed the editorial display gate yet. Details are available in Activity.</p><Link className="secondary" href="/activity">Open activity</Link></div> : null}
    </section>
  </main>;
}
