import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { beats, candidateFunnelItems, editorialRecommendations, researchCycles, researchSettings, stories } from "@/db/schema";
import { autopilotAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = getDb();
  if (db) await ensureResearchSchema();
  const beatRows = db ? await db.select().from(beats).where(eq(beats.active, true)).catch(() => []) : [];
  const cycleRows = db ? await db.select().from(researchCycles).orderBy(desc(researchCycles.createdAt)).limit(40).catch(() => []) : [];
  const candidateRows = db ? await db.select().from(candidateFunnelItems).orderBy(desc(candidateFunnelItems.createdAt)).limit(12).catch(() => []) : [];
  const recommendations = db ? await db.select().from(editorialRecommendations).where(ne(editorialRecommendations.status, "dismissed")).orderBy(desc(editorialRecommendations.createdAt)).limit(10).catch(() => []) : [];
  const dossierRows = db ? await db.select().from(stories).orderBy(desc(stories.createdAt)).limit(10).catch(() => []) : [];
  const [autopilot] = db ? await db.select().from(researchSettings).where(eq(researchSettings.key, "autopilot")).limit(1).catch(() => []) : [];
  const autopilotEnabled = autopilot?.value.enabled !== false;
  const latestCycle = cycleRows[0];

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

    <section className="control-panel" aria-label="Research controls">
      <div>
        <p className="eyebrow">Autopilot</p>
        <h1>{autopilotEnabled ? "Research is running" : "Research is paused"}</h1>
        <p>The agent advances one persisted stage at a time. Latest stage: <b>{latestCycle?.currentStage.replaceAll("_", " ") ?? "waiting for first cycle"}</b>.</p>
      </div>
      <form action={autopilotAction} className="switch-form">
        <input type="hidden" name="enabled" value={autopilotEnabled ? "false" : "true"} />
        <button className={`switch ${autopilotEnabled ? "is-on" : ""}`} type="submit" aria-pressed={autopilotEnabled}>
          <span className="switch-track"><span className="switch-thumb" /></span>
          <span>{autopilotEnabled ? "On" : "Paused"}</span>
        </button>
      </form>
    </section>

    <section className="status-strip" aria-label="What the agent does">
      <Status title="Searches" value="Archive sources on a beat schedule" />
      <Status title="Rejects" value="Duplicates, weak records, routine minutiae" />
      <Status title="Investigates" value="Evidence gaps and source independence" />
      <Status title="Stops" value="Downgrades leads that stay thin" />
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
      </article>) : <div className="empty"><h2>No publishable recommendations yet</h2><p>The pipeline has run, but nothing has passed the evidence gate for editorial recommendation. The app is showing research decisions below instead of inventing output.</p></div>}
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Research decisions</p>
        <h1>What the agent actually found</h1>
      </div>
      <span className="count">{candidateRows.length} recent decisions</span>
    </section>

    <section className="decision-list">
      {candidateRows.length ? candidateRows.map((candidate) => <article className="decision-card" key={candidate.id}>
        <div className="meta">
          <span className="pill">{candidate.status}</span>
          {candidate.rejectionCode ? <span className="pill">{candidate.rejectionCode.replaceAll("_", " ")}</span> : null}
        </div>
        <h2>{candidate.title}</h2>
        <p>{candidate.rejectionReason ?? candidate.hypothesis}</p>
      </article>) : <div className="empty"><h2>No research decisions yet</h2><p>The next scheduler run will write real archive decisions here.</p></div>}
    </section>
  </main>;
}

function Step({ label, value }: { label: string; value: string }) {
  return <div className="step"><span>{label}</span><b>{value}</b></div>;
}

function Score({ n, label }: { n: number; label: string }) {
  return <div className="score"><b>{n}</b><span>{label}</span></div>;
}

function Status({ title, value }: { title: string; value: string }) {
  return <div className="status-item"><b>{title}</b><span>{value}</span></div>;
}
