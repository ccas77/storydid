import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { beats, candidateFunnelItems, editorialRecommendations, researchCycles, researchSettings, stories } from "@/db/schema";
import { accessCodeConfigured, accessCodeReady } from "@/lib/action-auth";
import { isCitedDossier, isResearchedRecommendation } from "@/lib/research/display";
import { autopilotAction, recommendationAction, startResearchBriefAction } from "./actions";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const notice = noticeFromParams(params ?? {});
  const db = getDb();
  if (db) await ensureResearchSchema();
  const beatRows = db ? await db.select().from(beats).where(eq(beats.active, true)).catch(() => []) : [];
  const cycleRows = db ? await db.select().from(researchCycles).orderBy(desc(researchCycles.createdAt)).limit(40).catch(() => []) : [];
  const candidateRows = db ? await db.select().from(candidateFunnelItems).orderBy(desc(candidateFunnelItems.createdAt)).limit(12).catch(() => []) : [];
  const rawRecommendations = db ? await db.select().from(editorialRecommendations).where(ne(editorialRecommendations.status, "dismissed")).orderBy(desc(editorialRecommendations.createdAt)).limit(20).catch(() => []) : [];
  const rawDossierRows = db ? await db.select().from(stories).orderBy(desc(stories.createdAt)).limit(20).catch(() => []) : [];
  const recommendations = rawRecommendations.filter(isResearchedRecommendation).slice(0, 10);
  const dossierRows = rawDossierRows.filter(isCitedDossier).slice(0, 10);
  const [autopilot] = db ? await db.select().from(researchSettings).where(eq(researchSettings.key, "autopilot")).limit(1).catch(() => []) : [];
  const autopilotEnabled = autopilot?.value.enabled !== false;
  const latestCycle = cycleRows[0];
  const needsAccessCode = accessCodeConfigured();
  const controlsReady = accessCodeReady();

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

    {notice ? <section className={`notice ${notice.tone}`} role="status" aria-live="polite">
      <div>
        <p className="eyebrow">{notice.eyebrow}</p>
        <h1>{notice.title}</h1>
        <p>{notice.detail}</p>
      </div>
      {notice.href ? <Link className="secondary" href={notice.href}>{notice.cta}</Link> : null}
    </section> : null}

    <section className="control-panel" aria-label="Research controls">
      <div>
        <p className="eyebrow">Autopilot</p>
        <h1>{autopilotEnabled ? "Research is running" : "Research is paused"}</h1>
        <p>The agent advances one persisted stage at a time. Latest stage: <b>{latestCycle?.currentStage.replaceAll("_", " ") ?? "waiting for first cycle"}</b>.</p>
        {!controlsReady ? <p className="warning">Owner controls need RESEARCH_ACCESS_CODE configured in Vercel.</p> : null}
      </div>
      <form action={autopilotAction} className="switch-form">
        <input type="hidden" name="enabled" value={autopilotEnabled ? "false" : "true"} />
        <AccessCodeField enabled={needsAccessCode} />
        <button className={`switch ${autopilotEnabled ? "is-on" : ""}`} type="submit" aria-pressed={autopilotEnabled} disabled={!controlsReady}>
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

    <section className="brief-queue" aria-label="Queue a research brief">
      <div>
        <p className="eyebrow">Research brief</p>
        <h1>Give the agent a direction</h1>
        <p>The brief becomes a scheduled beat. Discovery, filtering, follow-up research, and dossier readiness still run as resumable background stages.</p>
      </div>
      <form action={startResearchBriefAction} className="brief-form">
        <textarea name="prompt" minLength={12} required placeholder="Example: a suspicious charity scandal in New York newspapers between 1890 and 1925" />
        <AccessCodeField enabled={needsAccessCode} />
        <button className="primary" type="submit" disabled={!controlsReady}>Queue brief</button>
      </form>
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
        <RecommendationActions id={recommendation.id} needsAccessCode={needsAccessCode} controlsReady={controlsReady} />
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

function AccessCodeField({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return <input className="access-code" name="accessCode" type="password" autoComplete="off" placeholder="Owner access code" required />;
}

function RecommendationActions({ id, needsAccessCode, controlsReady }: { id: string; needsAccessCode: boolean; controlsReady: boolean }) {
  return <div className="actions">
    {[
      ["develop", "Develop", "primary"],
      ["improve-angle", "Improve angle", "secondary"],
      ["investigate-further", "Investigate further", "secondary"],
      ["dismiss", "Dismiss", "ghost"],
    ].map(([action, label, className]) => <form action={recommendationAction} key={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <AccessCodeField enabled={needsAccessCode} />
      <button className={className} type="submit" disabled={!controlsReady}>{label}</button>
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
      detail: "The agent will advance it through discovery, filtering, follow-up research, and dossier readiness as separate resumable stages.",
      href: beat ? `/beats/${beat}` : undefined,
      cta: "Open beat",
    };
  }
  if (notice === "bad-code") {
    return {
      tone: "error",
      eyebrow: "Action blocked",
      title: "That owner access code did not match.",
      detail: "Use the current RESEARCH_ACCESS_CODE from Vercel, or rotate it and redeploy before trying again.",
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
      eyebrow: "Autopilot updated",
      title: notice === "autopilot-on" ? "Research is running." : "Research is paused.",
      detail: notice === "autopilot-on" ? "Scheduled cycles can advance again." : "Scheduled cycles will wait until autopilot is resumed.",
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
