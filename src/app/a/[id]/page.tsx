import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { articles } from "@/db/schema";
import { buildPublishReadyStory } from "@/lib/research/publishable-story";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (db) await ensureResearchSchema();
  const article = db ? (await db.select().from(articles).where(eq(articles.id, id)).limit(1).catch(() => []))[0] : undefined;
  if (!article) notFound();

  const refs = article.sources.map((source) => ({ id: source.id, archiveIdentifier: source.id, title: source.title, url: source.url, publicationDate: source.date ?? null }));
  const manuscript = buildPublishReadyStory({
    title: article.title,
    hook: article.hook,
    segments: article.segments,
    closingLine: article.closingLine,
    disclaimer: article.disclaimer,
    refs,
  });

  return <main className="shell">
    <div className="detail-nav"><Link href="/" className="back">← All articles</Link></div>
    <article className="detail">
      <div className="meta"><span className="pill ok">{article.wordCount} words</span><span className="pill">{article.createdAt.toLocaleDateString()}</span></div>
      <h1>{article.title}</h1>
      <article className="manuscript" aria-label="Article">
        {manuscript.body.map((block, index) => <section className={`manuscript-block ${block.kind}`} key={`${block.kind}-${index}`}>
          {block.heading ? <h3>{block.heading}</h3> : null}
          <p>{block.text} {block.citations.map((label) => <Citation key={label} label={label} sources={manuscript.sources} />)}</p>
        </section>)}
        {manuscript.sources.length ? <section className="manuscript-sources">
          <h3>Sources</h3>
          <ol>{manuscript.sources.map((source) => <li key={source.label}><a href={source.url} target="_blank" rel="noreferrer">[{source.label}] {source.title}</a>{source.publicationDate ? `, ${source.publicationDate}` : ""}</li>)}</ol>
        </section> : null}
      </article>
    </article>
  </main>;
}

function Citation({ label, sources }: { label: string; sources: Array<{ label: string; title: string; url: string }> }) {
  const source = sources.find((item) => item.label === label);
  return source ? <a className="cite" href={source.url} target="_blank" rel="noreferrer">[{label}]</a> : <span className="cite">[{label}]</span>;
}
