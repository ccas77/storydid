import Link from "next/link";
import { desc, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { editorialRecommendations, stories } from "@/db/schema";
import { demoStories } from "@/lib/demo";
import { recommendationAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = getDb();
  const recommendations = db
    ? await db.select().from(editorialRecommendations).where(ne(editorialRecommendations.status, "dismissed")).orderBy(desc(editorialRecommendations.createdAt)).limit(8).catch(() => [])
    : [];
  const dossiers = db
    ? await db.select().from(stories).orderBy(desc(stories.createdAt)).limit(8).catch(() => demoStories)
    : demoStories;
  const active = recommendations.filter((item) => item.status !== "dossier_ready");

  return <main className="shell">
    <header className="top">
      <div>
        <div className="brand">StoryDid</div>
        <div className="sub">Autonomous discovery, filtering, and deep research for overlooked historical stories.</div>
      </div>
      <nav className="nav"><Link href="/activity">Activity</Link></nav>
    </header>

    <section className="workflow" aria-label="Autonomous workflow">
      <Step label="Automatic discovery" value="scheduled archive searches" />
      <Step label="Autonomous filtering" value="reject, merge, rank" />
      <Step label="Deep research" value="follow-up evidence searches" />
      <Step label="Editorial decision" value="approve the story angle" />
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Editorial shortlist</p>
        <h1>Recommendations ready for decision</h1>
      </div>
      <span className="count">{active.length} active</span>
    </section>

    <section className="recommendations">
      {active.length ? active.map((recommendation) => <article className="recommendation" key={recommendation.id}>
        <div className="recommendation-top">
          <div>
            <div className="meta">
              <span className="pill">{recommendation.status.replaceAll("_", " ")}</span>
              <span className="pill">{recommendation.confidence}% confidence</span>
              <span className="pill">{recommendation.researchCompleteness}% complete</span>
            </div>
            <h2>{recommendation.workingTitle}</h2>
          </div>
          {recommendation.storyId ? <Link className="secondary" href={`/stories/${recommendation.storyId}`}>Open dossier</Link> : null}
        </div>
        <div className="brief-grid">
          <Brief title="Premise" text={recommendation.premise} />
          <Brief title="Narrative hook" text={recommendation.narrativeHook} />
          <Brief title="Why overlooked" text={recommendation.whyOverlooked} />
          <Brief title="Originality" text={recommendation.originalityAssessment} />
        </div>
        <ScoreStrip scores={recommendation.scores} />
        <EvidenceList title="Strongest evidence" value={recommendation.strongestEvidence} />
        <List title="Unresolved risks" items={recommendation.unresolvedRisks ?? []} />
        <p className="next-action"><b>Recommended next action:</b> {recommendation.recommendedNextAction}</p>
        <div className="actions">
          <Action id={recommendation.id} action="develop" label="Develop" />
          <Action id={recommendation.id} action="improve-angle" label="Improve angle" />
          <Action id={recommendation.id} action="investigate-further" label="Investigate further" />
          <Action id={recommendation.id} action="dismiss" label="Dismiss" subtle />
        </div>
      </article>) : <div className="empty">
        <h2>No editorial recommendations yet</h2>
        <p>The scheduled research agent will discover, reject, merge, and rank archive leads automatically. Approved candidates appear here instead of a raw inbox.</p>
      </div>}
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Finished dossiers</p>
        <h1>Evidence-backed outputs</h1>
      </div>
      <span className="count">{dossiers.length} dossiers</span>
    </section>
    <section className="grid">
      {dossiers.map((story) => <Link className="card" href={`/stories/${story.id}`} key={story.id}>
        <div className="meta"><span className="pill">{story.category}</span><span className="pill">{story.eventDate ?? "Date unknown"}</span><span className="pill">{story.location ?? "Location unknown"}</span></div>
        <h2>{story.workingTitle}</h2>
        <p>{story.summary}</p>
        <div className="scores"><Score n={story.interestScore} label="interest"/><Score n={story.sourceScore} label="sources"/><Score n={story.competitionScore} label="originality"/><Score n={story.confidenceScore} label="confidence"/></div>
      </Link>)}
    </section>
  </main>;
}

function Step({ label, value }: { label: string; value: string }) {
  return <div className="step"><span>{label}</span><b>{value}</b></div>;
}

function Brief({ title, text }: { title: string; text: string }) {
  return <div className="brief"><h3>{title}</h3><p>{text}</p></div>;
}

function ScoreStrip({ scores }: { scores: unknown }) {
  const items = [
    ["narrativeTension", "tension"],
    ["sourceStrength", "sources"],
    ["originality", "originality"],
    ["humanInterest", "human interest"],
    ["historicalConsequence", "consequence"],
    ["researchability", "researchability"],
  ] as const;
  return <div className="score-strip">{items.map(([key, label]) => <Score key={key} n={scoreValue(scores, key)} label={label} />)}</div>;
}

function EvidenceList({ title, value }: { title: string; value: unknown }) {
  const items = evidenceItems(value);
  if (!items.length) return null;
  return <section className="mini-section"><h3>{title}</h3><ul>{items.map((item, index) => <li key={index}>{item.claim} <span className="cite">{item.sourceIds.join(", ")}</span></li>)}</ul></section>;
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <section className="mini-section"><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

function Action({ id, action, label, subtle }: { id: string; action: string; label: string; subtle?: boolean }) {
  return <form action={recommendationAction}>
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="action" value={action} />
    <button className={subtle ? "ghost" : "primary"}>{label}</button>
  </form>;
}

function Score({n,label}:{n:number;label:string}){return <div className="score"><b>{n}</b><span>{label}</span></div>}

function scoreValue(scores: unknown, key: string) {
  if (!scores || typeof scores !== "object") return 0;
  const value = (scores as Record<string, unknown>)[key];
  return typeof value === "number" ? Math.round(value) : 0;
}

function evidenceItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return typeof record.claim === "string" ? [{ claim: record.claim, sourceIds: Array.isArray(record.sourceIds) ? record.sourceIds.filter((id): id is string => typeof id === "string") : [] }] : [];
  });
}
