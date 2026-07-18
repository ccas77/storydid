import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { beats, researchCycles, stories } from "@/db/schema";
import { isCompletedStory, uniqueEditorialStories } from "@/lib/research/display";
import { latestBriefProgress } from "@/lib/research/status";
import { startResearchBriefAction } from "./actions";
import { BriefSubmit } from "@/components/brief-submit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  const completedStories = uniqueEditorialStories(rawDossierRows.filter(isCompletedStory)).slice(0, 6);
  const latestBrief = latestBriefProgress(cycleRows, beatRows, rawDossierRows);

  return <main className="shell">
    <header className="top">
      <div>
        <div className="brand">StoryDid</div>
        <div className="sub">Submit a research brief. Read the completed story when one is ready.</div>
      </div>
      <nav className="nav"><Link href="/stories">Dossiers</Link> <Link href="/activity">Activity</Link></nav>
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
        <BriefSubmit />
      </form>
      <p className="sub">Researching a brief takes about a minute — it searches public archives, checks the evidence, and writes the full story before the page loads.</p>
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Finished stories</p>
        <h1>Ready to read</h1>
      </div>
      <Link className="secondary result-link" href="/stories">Browse all dossiers</Link>
    </section>
    {completedStories.length ? <section className="grid">
      {completedStories.map((story) => <Link className="card" href={`/stories/${story.id}`} key={story.id}>
        <div className="meta"><span className="pill ok">Completed story</span></div>
        <h2>{story.workingTitle}</h2>
        <p>{story.summary}</p>
      </Link>)}
    </section> : <div className="empty">
      <p>No finished story yet. Submit a brief above, or open <Link href="/stories">Dossiers</Link> to see what is being researched.</p>
    </div>}

    {latestBrief ? <section className="progress-panel" aria-label="Latest research progress">
      <div>
        <p className="eyebrow">Latest brief</p>
        <h2>{latestBrief.name}</h2>
        <p>{latestBrief.statusText}</p>
      </div>
      <Link className="secondary result-link" href={latestBrief.storyHref ?? "/activity"}>
        {latestBrief.storyHref ? "Open story" : "View progress"}
      </Link>
    </section> : null}
  </main>;
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
  if (notice === "brief-no-story") {
    return {
      tone: "error",
      eyebrow: "No story this time",
      title: "The archives didn't yield a strong enough story for that brief.",
      detail: "Try a more specific, event-driven topic — a named disaster, trial, scandal, or disappearance with a date and place tends to work best.",
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
