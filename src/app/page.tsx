import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { stories } from "@/db/schema";
import { isCitedDossier, uniqueEditorialStories } from "@/lib/research/display";
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
  const completedStory = uniqueEditorialStories(rawDossierRows.filter(isCitedDossier))[0];

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
  </main>;
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
