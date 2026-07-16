import Link from "next/link";
import { desc, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { editorialRecommendations, researchCycles, stories } from "@/db/schema";
import { isCitedDossier, isResearchedRecommendation } from "@/lib/research/display";
import { recommendationAction, startResearchBriefAction } from "./actions";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const notice = noticeFromParams(params ?? {});
  const db = getDb();
  if (db) await ensureResearchSchema();
  const cycleRows = db ? await db.select().from(researchCycles).orderBy(desc(researchCycles.createdAt)).limit(40).catch(() => []) : [];
  const rawRecommendations = db ? await db.select().from(editorialRecommendations).where(ne(editorialRecommendations.status, "dismissed")).orderBy(desc(editorialRecommendations.createdAt)).limit(20).catch(() => []) : [];
  const rawDossierRows = db ? await db.select().from(stories).orderBy(desc(stories.createdAt)).limit(20).catch(() => []) : [];
  const recommendations = rawRecommendations.filter(isResearchedRecommendation).slice(0, 10);
  const dossierRows = rawDossierRows.filter(isCitedDossier).slice(0, 10);
  const successfulCycles = cycleRows.filter((cycle) => cycle.status === "completed").length;

  return <main className="shell">
    <header className="top">
      <div>
        <div className="brand">StoryDid</div>
        <div className="sub">Submit a research brief. StoryDid brings back successful dossiers and recommendations when the evidence is strong enough.</div>
      </div>
      <nav className="nav"><Link href="/activity">Activity</Link></nav>
    </header>

    {notice ? <section className={`notice ${notice.tone}`} role="status" aria-live="polite">
      <div>
        <p className="eyebrow">{notice.eyebrow}</p>
        <h1>{notice.title}</h1>
        <p>{notice.detail}</p>
      </div>
      {notice.href ? <Link className="secondary" href={notice.href}>{notice.cta}</Link> : null}
    </section> : null}

    <section className="brief-queue primary-brief" aria-label="Queue a research brief">
      <div>
        <p className="eyebrow">Research brief</p>
        <h1>What should StoryDid investigate?</h1>
        <p>Give it a focused direction. The app will only surface successful recommendations or finished dossiers here.</p>
      </div>
      <form action={startResearchBriefAction} className="brief-form">
        <textarea name="prompt" minLength={12} required placeholder="Example: labor strike betrayal in Pennsylvania newspapers 1890 1935" />
        <button className="primary" type="submit">Start research</button>
      </form>
    </section>

    <section className="success-strip" aria-label="Successful output totals">
      <SuccessStat n={dossierRows.length} label="finished dossiers" />
      <SuccessStat n={recommendations.length} label="successful recommendations" />
      <SuccessStat n={successfulCycles} label="completed research runs" />
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Successes</p>
        <h1>Finished dossiers</h1>
      </div>
      <span className="count">{dossierRows.length} ready</span>
    </section>

    <section className="grid">
      {dossierRows.length ? dossierRows.map((story) => <Link className="card success-card" href={`/stories/${story.id}`} key={story.id}>
        <div className="meta"><span className="pill">dossier</span><span className="pill">{story.confidenceScore}% confidence</span></div>
        <h2>{story.workingTitle}</h2>
        <p>{story.summary}</p>
        <span className="secondary inline-link">Read story</span>
      </Link>) : <div className="empty"><h2>No finished dossiers yet</h2><p>Submit a brief. Successful reports will appear here when the evidence clears the readiness gate.</p></div>}
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Shortlist</p>
        <h1>Successful recommendations</h1>
      </div>
      <span className="count">{recommendations.length} visible</span>
    </section>

    <section className="recommendations compact">
      {recommendations.length ? recommendations.map((recommendation) => <article className="recommendation success-card" key={recommendation.id}>
        <div className="recommendation-top">
          <div>
            <div className="meta"><span className="pill">{recommendation.status.replaceAll("_", " ")}</span><span className="pill">{recommendation.confidence}% confidence</span><span className="pill">{recommendation.researchCompleteness}% complete</span></div>
            <h2>{recommendation.workingTitle}</h2>
            <p>{recommendation.premise}</p>
          </div>
          {recommendation.storyId ? <Link className="secondary" href={`/stories/${recommendation.storyId}`}>Read story</Link> : null}
        </div>
        <RecommendationActions id={recommendation.id} />
      </article>) : <div className="empty"><h2>No recommendations ready yet</h2><p>StoryDid will show recommendations here only when the evidence is strong enough to consider.</p></div>}
    </section>
  </main>;
}

function SuccessStat({ n, label }: { n: number; label: string }) {
  return <div className="success-stat"><b>{n}</b><span>{label}</span></div>;
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

function noticeFromParams(params: Record<string, string | string[] | undefined>) {
  const notice = valueParam(params.notice);
  const beat = valueParam(params.beat);
  const action = valueParam(params.action);
  if (notice === "brief-queued") {
    return {
      tone: "success",
      eyebrow: "Brief queued",
      title: "The research brief is in the scheduler.",
      detail: "If it produces a strong result, the dossier or recommendation will appear on this page.",
      href: beat ? `/beats/${beat}` : undefined,
      cta: "View this brief",
    };
  }
  if (notice === "missing-db") {
    return {
      tone: "error",
      eyebrow: "Configuration missing",
      title: "The database URL is not available to the app.",
      detail: "Set DATABASE_URL in the Vercel production environment, then redeploy.",
    };
  }
  if (notice === "brief-too-short") {
    return {
      tone: "error",
      eyebrow: "Brief not queued",
      title: "The research brief needs a little more detail.",
      detail: "Use at least 12 characters so the agent has enough direction to seed archive searches.",
    };
  }
  if (notice === "autopilot-on" || notice === "autopilot-off") {
    return {
      tone: "success",
      eyebrow: "Scheduler updated",
      title: notice === "autopilot-on" ? "Research is running." : "Research is paused.",
      detail: notice === "autopilot-on" ? "Scheduled cycles can advance again." : "Scheduled cycles will wait until research is resumed.",
    };
  }
  if (notice === "action-saved") {
    return {
      tone: "success",
      eyebrow: "Editorial action saved",
      title: `${actionLabel(action)} recorded.`,
      detail: "The activity view now includes this editorial decision.",
      href: "/activity",
      cta: "Open activity",
    };
  }
  if (notice === "missing-recommendation") {
    return {
      tone: "error",
      eyebrow: "Action blocked",
      title: "That recommendation could not be found.",
      detail: "Refresh the page and try again from a visible recommendation.",
    };
  }
  return undefined;
}

function valueParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function actionLabel(action?: string) {
  if (action === "improve-angle") return "Improve angle";
  if (action === "investigate-further") return "Investigate further";
  if (action === "dismiss") return "Dismiss";
  return "Develop";
}
