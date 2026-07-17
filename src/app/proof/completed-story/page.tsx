import Link from "next/link";
import { notFound } from "next/navigation";
import { completedStoryProofManuscript } from "@/lib/research/completed-story-proof";
import { PUBLISH_READY_TARGET_WORDS } from "@/lib/research/story-length";

export const dynamic = "force-dynamic";

export default function CompletedStoryProofPage() {
  if (process.env.STORYDID_ENABLE_COMPLETED_STORY_PROOF !== "1") notFound();

  const manuscript = completedStoryProofManuscript();

  return <main className="shell">
    <div className="detail-nav">
      <Link href="/" className="back">← Newsroom</Link>
    </div>
    <article className="detail">
      <div className="meta">
        <span className="pill">Proof fixture</span>
        <span className="pill">{manuscript.wordCount} words</span>
        <span className="pill">{PUBLISH_READY_TARGET_WORDS}-word target</span>
      </div>
      <h1>{manuscript.title}</h1>
      <p className="lede">A completed StoryDid manuscript rendered through the same publish-ready story formatter used by generated dossiers.</p>
      <section className="script-panel" id="generated-story">
        <div className="script-head">
          <div>
            <p className="eyebrow">Full story</p>
            <h2>Ready for publishing</h2>
          </div>
        </div>
        <article className="manuscript" aria-label="Publish-ready story">
          {manuscript.body.map((item, index) => <section className={`manuscript-block ${item.kind}`} key={`${item.kind}-${index}`}>
            {item.heading ? <h3>{item.heading}</h3> : null}
            <p>{item.text} {item.citations.map((label) => <Citation key={label} label={label} sources={manuscript.sources} />)}</p>
          </section>)}
          <section className="manuscript-sources">
            <h3>Sources</h3>
            <ol>{manuscript.sources.map((source) => <li key={source.label}>
              <a href={source.url} target="_blank" rel="noreferrer">[{source.label}] {source.title}</a>{source.publicationDate ? `, ${source.publicationDate}` : ""}
            </li>)}</ol>
          </section>
        </article>
      </section>
    </article>
  </main>;
}

function Citation({ label, sources }: { label: string; sources: Array<{ label: string; title: string; url: string }> }) {
  const source = sources.find((item) => item.label === label);
  return source ? <a className="cite" href={source.url} target="_blank" rel="noreferrer">[{label}]</a> : <span className="cite">[{label}]</span>;
}
