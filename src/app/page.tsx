import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { beats, researchCycles, stories } from "@/db/schema";
import { isCompletedStory, uniqueEditorialStories } from "@/lib/research/display";
import { startResearchBriefAction } from "./actions";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const notice = noticeFromParams(params ?? {});
  const db = getDb();
  if (db) await ensureResearchSchema();
  const rawDossierRows = db ? await db.select().from(stories).orderBy(desc(stories.createdAt)).limit(50).catch(() => []) : [];
  const cycleRows = db ? await db.select().from(researchCycles).orderBy(desc(researchCycles.createdAt)).limit(12).catch(() => []) : [];
  const beatRows = db ? await db.select().from(beats).orderBy(desc(beats.createdAt)).limit(80).catch(() => []) : [];
  const completedStory = uniqueEditorialStories(rawDossierRows.filter(isCompletedStory))[0];
  const latestBrief = latestBriefProgress(cycleRows, beatRows);

  return <main className="shell">
    <header className="top">
      <div>
        <div className="brand">StoryDid</div>
        <div className="sub">Submit a research brief. Read the completed story when one is ready.</div>
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
        <p>Give it a focused direction. Everything operational stays off this page.</p>
      </div>
      <form action={startResearchBriefAction} className="brief-form">
        <textarea name="prompt" minLength={12} required placeholder="Example: labor strike betrayal in Pennsylvania newspapers 1890 1935" />
        <button className="primary" type="submit">Start research</button>
      </form>
    </section>

    <section className="single-result" aria-label="Completed story">
      {completedStory ? <Link className="primary result-link" href={`/stories/${completedStory.id}`}>Read completed story</Link> : <p>No completed story yet.</p>}
      <Link className="secondary result-link" href="/activity">Research activity</Link>
    </section>

    {latestBrief ? <section className="progress-panel" aria-label="Latest research progress">
      <div>
        <p className="eyebrow">Latest brief</p>
        <h2>{latestBrief.name}</h2>
        <p>{latestBrief.statusText}</p>
      </div>
      <Link className="secondary result-link" href="/activity">View progress</Link>
    </section> : null}
  </main>;
}

function latestBriefProgress(
  cycles: Array<{ beatId: string | null; status: string; currentStage: string; stageState: Record<string, unknown>; createdAt: Date }>,
  beatRows: Array<{ id: string; name: string; description: string }>,
) {
  const beatById = new Map(beatRows.map((beat) => [beat.id, beat]));
  for (const cycle of cycles) {
    const beat = cycle.beatId ? beatById.get(cycle.beatId) : undefined;
    const fromBrief = cycle.stageState?.source === "user_brief" || beat?.description.startsWith("User research brief:");
    if (!fromBrief) continue;
    return {
      name: beat?.name ?? "Research brief",
      statusText: progressText(cycle.status, cycle.currentStage),
    };
  }
  return undefined;
}

function progressText(status: string, stage: string) {
  const stageLabel = stage.replaceAll("_", " ");
  if (status === "queued") return `Queued · next stage: ${stageLabel}`;
  if (status === "running") return `Running · current stage: ${stageLabel}`;
  if (status === "completed") return "Finished · no completed story passed the story gate yet";
  if (status === "failed") return `Needs attention · stopped during ${stageLabel}`;
  return `${status} · ${stageLabel}`;
}

function noticeFromParams(params: Record<string, string | string[] | undefined>) {
  const notice = valueParam(params.notice);
  const action = valueParam(params.action);
  if (notice === "brief-queued") {
    return {
      tone: "success",
      eyebrow: "Brief queued",
      title: "The research brief is in the scheduler.",
      detail: "Its status is shown below. The detailed research log is in Activity.",
      href: "/activity",
      cta: "View progress",
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
