import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { articles } from "@/db/schema";
import { writeArticleAction } from "./actions";
import { BriefSubmit } from "@/components/brief-submit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type HomeProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const notice = noticeFrom(valueParam((params ?? {}).notice));
  const db = getDb();
  if (db) await ensureResearchSchema();
  const rows = db ? await db.select({ id: articles.id, title: articles.title, topic: articles.topic, wordCount: articles.wordCount, createdAt: articles.createdAt }).from(articles).orderBy(desc(articles.createdAt)).limit(30).catch(() => []) : [];

  return <main className="shell">
    <header className="top">
      <div>
        <div className="brand">StoryDid</div>
        <div className="sub">Type a topic. It searches public historical archives and writes a sourced ~2000-word article.</div>
      </div>
    </header>

    {notice ? <section className={`notice ${notice.tone}`} role="status" aria-live="polite">
      <div>
        <p className="eyebrow">{notice.eyebrow}</p>
        <h1>{notice.title}</h1>
        <p>{notice.detail}</p>
      </div>
    </section> : null}

    <section className="brief-queue primary-brief" aria-label="Write an article">
      <div>
        <p className="eyebrow">New article</p>
        <h1>What should we write about?</h1>
        <p>Be specific — a named event with a date and place works best (e.g. &ldquo;1907 Monongah mine explosion West Virginia&rdquo;).</p>
      </div>
      <form action={writeArticleAction} className="brief-form">
        <textarea name="topic" minLength={8} required placeholder="Example: 1911 Triangle Shirtwaist factory fire investigation" />
        <BriefSubmit />
      </form>
      <p className="sub">Writing takes about a minute — it searches the archives, then composes the full article before the page loads.</p>
    </section>

    <section className="section-head">
      <div>
        <p className="eyebrow">Your articles</p>
        <h1>Written so far</h1>
      </div>
      <span className="count">{rows.length}</span>
    </section>

    {rows.length ? <section className="grid">
      {rows.map((article) => <Link className="card" href={`/a/${article.id}`} key={article.id}>
        <div className="meta"><span className="pill ok">{article.wordCount} words</span><span className="pill">{article.createdAt.toLocaleDateString()}</span></div>
        <h2>{article.title}</h2>
      </Link>)}
    </section> : <div className="empty">
      <p>No articles yet. Type a topic above and press <b>Write the article</b>.</p>
    </div>}
  </main>;
}

function noticeFrom(notice: string | undefined) {
  if (notice === "no-sources") return { tone: "error", eyebrow: "No sources found", title: "The archives didn't have enough on that topic.", detail: "Try a more specific historical event — a named disaster, trial, strike, or disappearance with a date and place." };
  if (notice === "write-failed") return { tone: "error", eyebrow: "Couldn't finish", title: "Something went wrong while writing.", detail: "Please try again in a moment. If it keeps happening, try rewording the topic." };
  if (notice === "topic-too-short") return { tone: "error", eyebrow: "Add a little more", title: "The topic needs a few more words.", detail: "Use at least 8 characters so there's enough to search for." };
  if (notice === "missing-db") return { tone: "error", eyebrow: "Not configured", title: "The database isn't connected.", detail: "Set DATABASE_URL in the Vercel project and redeploy." };
  return undefined;
}

function valueParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
