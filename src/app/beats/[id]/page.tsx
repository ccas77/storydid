import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { beats, editorialRecommendations, stories } from "@/db/schema";
import { isCitedDossier, isResearchedRecommendation } from "@/lib/research/display";
import { recommendationAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function BeatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (!db) notFound();
  await ensureResearchSchema();
  const [beat] = await db.select().from(beats).where(eq(beats.slug, id)).limit(1);
  if (!beat) notFound();

  const rawRecommendations = await db.select().from(editorialRecommendations).where(eq(editorialRecommendations.beatId, beat.id)).orderBy(desc(editorialRecommendations.createdAt)).limit(16).catch(() => []);
  const rawDossiers = await db.select().from(stories).where(eq(stories.beatId, beat.id)).orderBy(desc(stories.createdAt)).limit(16).catch(() => []);
  const recommendations = rawRecommendations.filter(isResearchedRecommendation).slice(0, 8);
  const dossiers = rawDossiers.filter(isCitedDossier).slice(0, 8);

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
        <p className="eyebrow">Successes</p>
        <h1>Reports and recommendations</h1>
      </div>
      <span className="count">{dossiers.length + recommendations.length} ready</span>
    </section>
    <section className="grid">
      {dossiers.map((story) => <Link className="card success-card" href={`/stories/${story.id}`} key={story.id}>
        <div className="meta"><span className="pill">dossier</span><span className="pill">{story.confidenceScore}% confidence</span></div>
        <h2>{story.workingTitle}</h2>
        <p>{story.summary}</p>
        <span className="secondary inline-link">Open report</span>
      </Link>)}
      {recommendations.map((recommendation) => <article className="card success-card" key={recommendation.id}>
        <div className="meta"><span className="pill">{recommendation.status.replaceAll("_", " ")}</span><span className="pill">{recommendation.confidence}% confidence</span></div>
        <h2>{recommendation.workingTitle}</h2>
        <p>{recommendation.premise}</p>
        {recommendation.storyId ? <Link className="secondary" href={`/stories/${recommendation.storyId}`}>Open dossier</Link> : null}
        <RecommendationActions id={recommendation.id} />
      </article>)}
      {!dossiers.length && !recommendations.length ? <div className="empty"><h2>No successes yet</h2><p>Nothing from this brief has passed the evidence gate yet. Details are available in Activity.</p><Link className="secondary" href="/activity">Open activity</Link></div> : null}
    </section>
  </main>;
}

function RecommendationActions({ id }: { id: string }) {
  return <div className="actions">
    {[
      ["develop", "Develop", "primary"],
      ["improve-angle", "Improve angle", "secondary"],
      ["investigate-further", "Investigate further", "secondary"],
      ["dismiss", "Dismiss", "ghost"],
    ].map(([action, label, className]) => <form action={recommendationAction} key={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button className={className} type="submit">{label}</button>
    </form>)}
  </div>;
}
