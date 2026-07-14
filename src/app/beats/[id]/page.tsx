import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { beats, candidateFunnelItems, editorialRecommendations, researchCycles, researchInvestigations, researchStageBudgets, stories } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function BeatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (!db) notFound();
  const [beat] = await db.select().from(beats).where(eq(beats.slug, id)).limit(1);
  if (!beat) notFound();

  const cycles = await db.select().from(researchCycles).where(eq(researchCycles.beatId, beat.id)).orderBy(desc(researchCycles.createdAt)).limit(8).catch(() => []);
  const latest = cycles[0];
  const candidates = latest ? await db.select().from(candidateFunnelItems).where(eq(candidateFunnelItems.cycleId, latest.id)).catch(() => []) : [];
  const investigations = latest ? await db.select().from(researchInvestigations).where(eq(researchInvestigations.cycleId, latest.id)).catch(() => []) : [];
  const budgets = latest ? await db.select().from(researchStageBudgets).where(eq(researchStageBudgets.cycleId, latest.id)).catch(() => []) : [];
  const recommendations = await db.select().from(editorialRecommendations).where(eq(editorialRecommendations.beatId, beat.id)).orderBy(desc(editorialRecommendations.createdAt)).limit(8).catch(() => []);
  const dossiers = await db.select().from(stories).where(eq(stories.beatId, beat.id)).orderBy(desc(stories.createdAt)).limit(8).catch(() => []);

  return <main className="shell">
    <header className="top">
      <div>
        <Link href="/" className="back">← Newsroom</Link>
        <h1>{beat.name}</h1>
        <p className="lede">{beat.description}</p>
      </div>
      <nav className="nav"><Link href="/activity">Activity</Link></nav>
    </header>

    <section className="stats">
      <Stat n={cycles.length} label="recent cycles" />
      <Stat n={candidates.filter((item) => item.status === "active" || item.status === "researching").length} label="live candidates" />
      <Stat n={investigations.filter((item) => item.status === "active").length} label="investigations" />
      <Stat n={dossiers.length} label="dossiers" />
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Latest cycle</p>
        <h1>{latest ? latest.currentStage.replaceAll("_", " ") : "Not scheduled yet"}</h1>
      </div>
      {latest ? <span className="count">{latest.status}</span> : null}
    </section>

    <section className="grid">
      <Panel title="Funnel summary">
        <Metric label="active" n={candidates.filter((item) => item.status === "active").length} />
        <Metric label="researching" n={candidates.filter((item) => item.status === "researching").length} />
        <Metric label="duplicates" n={candidates.filter((item) => item.status === "duplicate").length} />
        <Metric label="rejected" n={candidates.filter((item) => item.status === "rejected").length} />
      </Panel>
      <Panel title="Stage budgets">
        {budgets.length ? budgets.map((budget) => <div className="budget-row" key={budget.id}>
          <b>{budget.stage.replaceAll("_", " ")}</b>
          <span>{budget.usedRecords}/{budget.maxRecords} records</span>
          <span>{budget.usedSearches}/{budget.maxSearches} searches</span>
          <span>{budget.usedModelCalls}/{budget.maxModelCalls} model calls</span>
        </div>) : <p>No budget rows for the latest cycle yet.</p>}
      </Panel>
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Investigations</p>
        <h1>Controlled research questions</h1>
      </div>
    </section>
    <section className="recommendations compact">
      {investigations.length ? investigations.map((investigation) => <article className="recommendation" key={investigation.id}>
        <div className="meta"><span className="pill">{investigation.status.replaceAll("_", " ")}</span><span className="pill">{investigation.evidenceDepth}% evidence depth</span><span className="pill">{investigation.readinessScore}% readiness</span></div>
        <h2>{investigation.workingTitle}</h2>
        <p>{investigation.premise}</p>
        <List items={stringArray(investigation.researchQuestions)} />
      </article>) : <div className="empty"><h2>No investigations yet</h2><p>The next cycle stages will create controlled investigations for candidates that survive the funnel.</p></div>}
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Outputs</p>
        <h1>Recommendations and dossiers</h1>
      </div>
    </section>
    <section className="grid">
      {recommendations.map((recommendation) => <article className="card" key={recommendation.id}>
        <div className="meta"><span className="pill">{recommendation.status.replaceAll("_", " ")}</span><span className="pill">{recommendation.confidence}% confidence</span></div>
        <h2>{recommendation.workingTitle}</h2>
        <p>{recommendation.premise}</p>
        {recommendation.storyId ? <Link className="secondary" href={`/stories/${recommendation.storyId}`}>Open dossier</Link> : null}
      </article>)}
      {dossiers.map((story) => <Link className="card" href={`/stories/${story.id}`} key={story.id}>
        <div className="meta"><span className="pill">dossier</span><span className="pill">{story.confidenceScore}% confidence</span></div>
        <h2>{story.workingTitle}</h2>
        <p>{story.summary}</p>
      </Link>)}
    </section>
  </main>;
}

function Stat({ n, label }: { n: number; label: string }) {
  return <div className="stat"><strong>{n}</strong><span>{label}</span></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card"><h2>{title}</h2>{children}</section>;
}

function Metric({ n, label }: { n: number; label: string }) {
  return <div className="metric"><b>{n}</b><span>{label}</span></div>;
}

function List({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
