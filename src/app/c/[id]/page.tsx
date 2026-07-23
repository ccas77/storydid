import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { collections } from "@/db/schema";
import { moreEventsAction, writeEventArticleAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { noticeFrom } from "@/lib/notices";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const notice = noticeFrom(valueParam((sp ?? {}).notice));
  const db = getDb();
  if (db) await ensureResearchSchema();
  const collection = db ? (await db.select().from(collections).where(eq(collections.id, id)).limit(1).catch(() => []))[0] : undefined;
  if (!collection) notFound();

  return <main className="shell">
    <div className="detail-nav"><Link href="/" className="back">← All themes</Link></div>
    <header className="top">
      <div>
        <p className="eyebrow">Theme</p>
        <h1>{collection.theme}</h1>
        <p className="lede">Real events found for this theme. Click <b>Write article</b> on any one — it searches the archives and writes a sourced ~2000-word article (about a minute).</p>
      </div>
    </header>

    {notice ? <section className={`notice ${notice.tone}`} role="status" aria-live="polite">
      <div><p className="eyebrow">{notice.eyebrow}</p><h2>{notice.title}</h2><p>{notice.detail}</p></div>
    </section> : null}

    <section className="recommendations">
      {collection.events.map((event, index) => <article className="recommendation" key={`${event.title}-${index}`}>
        <div className="recommendation-top">
          <div>
            <div className="meta"><span className="pill">{event.year}</span>{event.articleId ? <span className="pill ok">Article written</span> : null}</div>
            <h2>{event.title}</h2>
          </div>
          {event.articleId
            ? <Link className="secondary" href={`/a/${event.articleId}`}>Read article</Link>
            : <form action={writeEventArticleAction}>
                <input type="hidden" name="collectionId" value={collection.id} />
                <input type="hidden" name="index" value={index} />
                <SubmitButton idle="Write article" pending="Writing… (~1 min)" />
              </form>}
        </div>
        <p>{event.summary}</p>
      </article>)}
    </section>

    <section className="more-row">
      <form action={moreEventsAction}>
        <input type="hidden" name="collectionId" value={collection.id} />
        <SubmitButton idle="Find more events" pending="Finding more…" className="secondary" />
      </form>
    </section>
  </main>;
}

function valueParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
