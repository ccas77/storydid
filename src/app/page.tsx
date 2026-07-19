import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { articles, collections } from "@/db/schema";
import { startCollectionAction } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type HomeProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const notice = noticeFrom(valueParam((params ?? {}).notice));
  const db = getDb();
  if (db) await ensureResearchSchema();
  const collectionRows = db ? await db.select({ id: collections.id, theme: collections.theme, events: collections.events, createdAt: collections.createdAt }).from(collections).orderBy(desc(collections.createdAt)).limit(20).catch(() => []) : [];
  const articleRows = db ? await db.select({ id: articles.id, title: articles.title, wordCount: articles.wordCount }).from(articles).orderBy(desc(articles.createdAt)).limit(12).catch(() => []) : [];

  return <main className="shell">
    <header className="top">
      <div>
        <div className="brand">StoryDid</div>
        <div className="sub">Name a theme or era. It finds the real events worth covering, then researches and writes a sourced article on any you pick.</div>
      </div>
    </header>

    {notice ? <section className={`notice ${notice.tone}`} role="status" aria-live="polite">
      <div>
        <p className="eyebrow">{notice.eyebrow}</p>
        <h1>{notice.title}</h1>
        <p>{notice.detail}</p>
      </div>
    </section> : null}

    <section className="brief-queue primary-brief" aria-label="Start a theme">
      <div>
        <p className="eyebrow">New theme</p>
        <h1>What should we dig into?</h1>
        <p>Give a theme or era — e.g. &ldquo;20th century corporate scandals,&rdquo; &ldquo;famous shipwrecks,&rdquo; or &ldquo;Gilded Age labor strikes.&rdquo; It comes back with a list of real events.</p>
      </div>
      <form action={startCollectionAction} className="brief-form">
        <textarea name="theme" minLength={6} required placeholder="Example: 20th century corporate scandals" />
        <SubmitButton idle="Find the events" pending="Finding real events…" />
      </form>
    </section>

    {collectionRows.length ? <>
      <section className="section-head">
        <div>
          <p className="eyebrow">Your themes</p>
          <h1>Collections</h1>
        </div>
      </section>
      <section className="grid">
        {collectionRows.map((collection) => {
          const written = collection.events.filter((event) => event.articleId).length;
          return <Link className="card" href={`/c/${collection.id}`} key={collection.id}>
            <div className="meta"><span className="pill">{collection.events.length} events</span><span className="pill ok">{written} written</span></div>
            <h2>{collection.theme}</h2>
          </Link>;
        })}
      </section>
    </> : null}

    {articleRows.length ? <>
      <section className="section-head">
        <div>
          <p className="eyebrow">Finished articles</p>
          <h1>Written so far</h1>
        </div>
      </section>
      <section className="grid">
        {articleRows.map((article) => <Link className="card" href={`/a/${article.id}`} key={article.id}>
          <div className="meta"><span className="pill ok">{article.wordCount} words</span></div>
          <h2>{article.title}</h2>
        </Link>)}
      </section>
    </> : null}

    {!collectionRows.length && !articleRows.length ? <div className="empty">
      <p>Nothing yet. Type a theme above and press <b>Find the events</b> to get started.</p>
    </div> : null}
  </main>;
}

function noticeFrom(notice: string | undefined) {
  if (notice === "no-events") return { tone: "error", eyebrow: "No events", title: "Couldn't find clear events for that theme.", detail: "Try a broader or more historical framing — e.g. an era plus a subject like &lsquo;19th century mining disasters.&rsquo;" };
  if (notice === "list-failed") return { tone: "error", eyebrow: "Couldn't build the list", title: "Something went wrong finding events.", detail: "Please try again in a moment." };
  if (notice === "no-sources") return { tone: "error", eyebrow: "No sources found", title: "The archives didn't have enough on that event.", detail: "Pick a different event from the list — some have far more archival coverage than others." };
  if (notice === "write-failed") return { tone: "error", eyebrow: "Couldn't finish", title: "Something went wrong while writing.", detail: "Please try again in a moment." };
  if (notice === "topic-too-short") return { tone: "error", eyebrow: "Add a little more", title: "The theme needs a few more words.", detail: "Use at least 6 characters." };
  if (notice === "missing-db") return { tone: "error", eyebrow: "Not configured", title: "The database isn't connected.", detail: "Set DATABASE_URL in the Vercel project and redeploy." };
  return undefined;
}

function valueParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
