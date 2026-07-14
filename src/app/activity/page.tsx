import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { candidateFunnelItems, researchActivity, researchCycles, researchInvestigations, researchRuns, researchStageBudgets } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const db = getDb();
  if (db) await ensureResearchSchema();
  const events = db ? await db.select().from(researchActivity).orderBy(desc(researchActivity.createdAt)).limit(140).catch(() => []) : [];
  const runs = db ? await db.select().from(researchRuns).orderBy(desc(researchRuns.startedAt)).limit(8).catch(() => []) : [];
  const cycles = db ? await db.select().from(researchCycles).orderBy(desc(researchCycles.createdAt)).limit(12).catch(() => []) : [];
  const budgets = db ? await db.select().from(researchStageBudgets).orderBy(desc(researchStageBudgets.createdAt)).limit(24).catch(() => []) : [];
  const candidates = db ? await db.select().from(candidateFunnelItems).orderBy(desc(candidateFunnelItems.createdAt)).limit(30).catch(() => []) : [];
  const investigations = db ? await db.select().from(researchInvestigations).orderBy(desc(researchInvestigations.createdAt)).limit(20).catch(() => []) : [];

  return <main className="shell">
    <header className="top">
      <div>
        <Link href="/" className="back">← Newsroom</Link>
        <h1>Research Activity</h1>
        <p className="lede">Operational detail for what the autonomous research agent scheduled, searched, rejected, merged, investigated, downgraded, and completed.</p>
      </div>
    </header>

    <section className="stats">
      <Stat n={cycles.filter((cycle) => cycle.status === "running").length} label="running cycles" />
      <Stat n={events.filter((event) => event.kind === "search").length} label="search events" />
      <Stat n={candidates.filter((candidate) => candidate.status === "rejected").length} label="recent rejections" />
      <Stat n={investigations.filter((item) => item.status === "active").length} label="active investigations" />
    </section>

    <section className="grid">
      <Panel title="Research cycles">
        {cycles.length ? cycles.map((cycle) => <div className="budget-row" key={cycle.id}>
          <b>{cycle.currentStage.replaceAll("_", " ")}</b>
          <span>{cycle.status}</span>
          <span>{cycle.createdAt.toLocaleString()}</span>
        </div>) : <p>No cycles yet.</p>}
      </Panel>
      <Panel title="Stage budgets">
        {budgets.length ? budgets.map((budget) => <div className="budget-row" key={budget.id}>
          <b>{budget.stage.replaceAll("_", " ")}</b>
          <span>{budget.usedRecords}/{budget.maxRecords} records</span>
          <span>{budget.usedSearches}/{budget.maxSearches} searches</span>
          <span>{budget.usedModelCalls}/{budget.maxModelCalls} model calls</span>
        </div>) : <p>No budgets yet.</p>}
      </Panel>
    </section>

    <section className="grid">
      <Panel title="Candidate decisions">
        {candidates.length ? candidates.map((candidate) => <div className="decision-row" key={candidate.id}>
          <span className="pill">{candidate.status}</span>
          <b>{candidate.title}</b>
          {candidate.rejectionCode ? <span>{candidate.rejectionCode}: {candidate.rejectionReason}</span> : <span>{candidate.hypothesis}</span>}
        </div>) : <p>No candidate decisions yet.</p>}
      </Panel>
      <Panel title="Investigations">
        {investigations.length ? investigations.map((investigation) => <div className="decision-row" key={investigation.id}>
          <span className="pill">{investigation.status.replaceAll("_", " ")}</span>
          <b>{investigation.workingTitle}</b>
          <span>{investigation.evidenceDepth}% evidence depth, {investigation.readinessScore}% readiness</span>
        </div>) : <p>No investigations yet.</p>}
      </Panel>
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Timeline</p>
        <h1>Agent log</h1>
      </div>
      <span className="count">{runs.length} recent runs</span>
    </section>
    <section className="timeline">
      {events.length ? events.map((event) => <article className="event" key={event.id}>
        <div className="event-kind">{event.kind.replaceAll("_", " ")}</div>
        <div>
          <h2>{event.title}</h2>
          <p>{event.detail}</p>
          <time>{event.createdAt.toLocaleString()}</time>
        </div>
      </article>) : <div className="empty"><h2>No activity yet</h2><p>The next scheduled discovery run will write a stage-by-stage decision trail here.</p></div>}
    </section>
  </main>;
}

function Stat({ n, label }: { n: number; label: string }) {
  return <div className="stat"><strong>{n}</strong><span>{label}</span></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card"><h2>{title}</h2>{children}</section>;
}
