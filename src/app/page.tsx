import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { beats, editorialRecommendations, researchCycles, stories } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = getDb();
  const beatRows = db ? await db.select().from(beats).where(eq(beats.active, true)).catch(() => []) : [];
  const cycleRows = db ? await db.select().from(researchCycles).orderBy(desc(researchCycles.createdAt)).limit(40).catch(() => []) : [];
  const recommendations = db ? await db.select().from(editorialRecommendations).where(ne(editorialRecommendations.status, "dismissed")).orderBy(desc(editorialRecommendations.createdAt)).limit(10).catch(() => []) : [];
  const dossierRows = db ? await db.select().from(stories).orderBy(desc(stories.createdAt)).limit(10).catch(() => []) : [];

  return <main className="shell">
    <header className="top">
      <div>
        <div className="brand">StoryDid</div>
        <div className="sub">Beat-based autonomous research newsroom. The system discovers, filters, investigates, and only brings forward researched editorial decisions.</div>
      </div>
      <nav className="nav"><Link href="/activity">Activity</Link></nav>
    </header>

    <section className="workflow" aria-label="Autonomous workflow">
      <Step label="Automatic discovery" value="beat schedule" />
      <Step label="Autonomous filtering" value="candidate funnel" />
      <Step label="Controlled research" value="investigations" />
      <Step label="Editorial approval" value="dossiers and actions" />
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Newsroom</p>
        <h1>Research beats</h1>
      </div>
      <span className="count">{beatRows.length} active beats</span>
    </section>

    <section className="beat-grid">
      {beatRows.length ? beatRows.map((beat) => {
        const latestCycle = cycleRows.find((cycle) => cycle.beatId === beat.id);
        const activeRecommendations = recommendations.filter((recommendation) => recommendation.beatId === beat.id && recommendation.status !== "dossier_ready").length;
        const beatDossiers = dossierRows.filter((story) => story.beatId === beat.id).length;
        return <Link className="beat-card" href={`/beats/${beat.slug}`} key={beat.id}>
          <div className="meta"><span className="pill">{latestCycle?.currentStage.replaceAll("_", " ") ?? "not scheduled"}</span><span className="pill">weight {beat.cadenceWeight}</span></div>
          <h2>{beat.name}</h2>
          <p>{beat.description}</p>
          <div className="scores">
            <Score n={activeRecommendations} label="recommendations" />
            <Score n={beatDossiers} label="dossiers" />
            <Score n={latestCycle?.status === "running" ? 1 : 0} label="running" />
            <Score n={Array.isArray(beat.querySeeds) ? beat.querySeeds.length : 0} label="seeds" />
          </div>
        </Link>;
      }) : <div className="empty"><h2>No beats yet</h2><p>Run the database migrations, then the scheduled agent will seed the newsroom beats.</p></div>}
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Editorial shortlist</p>
        <h1>Latest recommendations</h1>
      </div>
      <span className="count">{recommendations.length} visible</span>
    </section>

    <section className="recommendations compact">
      {recommendations.length ? recommendations.map((recommendation) => <article className="recommendation" key={recommendation.id}>
        <div className="recommendation-top">
          <div>
            <div className="meta"><span className="pill">{recommendation.status.replaceAll("_", " ")}</span><span className="pill">{recommendation.confidence}% confidence</span><span className="pill">{recommendation.researchCompleteness}% complete</span></div>
            <h2>{recommendation.workingTitle}</h2>
            <p>{recommendation.premise}</p>
          </div>
          {recommendation.storyId ? <Link className="secondary" href={`/stories/${recommendation.storyId}`}>Open dossier</Link> : null}
        </div>
      </article>) : <div className="empty"><h2>No recommendations yet</h2><p>Recommendations appear after a beat cycle passes discovery, funnel, investigation, and readiness gates.</p></div>}
    </section>
  </main>;
}

function Step({ label, value }: { label: string; value: string }) {
  return <div className="step"><span>{label}</span><b>{value}</b></div>;
}

function Score({ n, label }: { n: number; label: string }) {
  return <div className="score"><b>{n}</b><span>{label}</span></div>;
}
