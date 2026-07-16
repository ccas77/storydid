import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { ensureResearchSchema } from "@/db/bootstrap";
import { sources, stories } from "@/db/schema";
import { isCitedDossier } from "@/lib/research/display";
import { buildStoryNarrative } from "@/lib/research/story-narrative";

export const dynamic = "force-dynamic";

export default async function StoryPage({params}:{params:Promise<{id:string}>}) {
  const { id } = await params;
  const db = getDb();
  if (db) await ensureResearchSchema();
  const story = db ? (await db.select().from(stories).where(eq(stories.id,id)).limit(1).catch(() => []))[0] : undefined;
  if(!story || !isCitedDossier(story)) notFound();
  const refs = db ? await db.select().from(sources).where(eq(sources.storyId,id)).catch(() => []) : [];
  const beatHref = story.beatId ? `/?highlight=${story.beatId}` : "/";
  const narrative = buildStoryNarrative({
    workingTitle: story.workingTitle,
    summary: story.summary,
    premise: field(story, "premise"),
    narrativeHook: field(story, "narrativeHook"),
    whyOverlooked: field(story, "whyOverlooked"),
    originalityAssessment: field(story, "originalityAssessment"),
    keyFacts: story.keyFacts,
    unresolvedRisks: arrayField(story, "unresolvedRisks"),
    conflicts: story.conflicts,
    claimCitations: story.claimCitations,
  });

  return <main className="shell">
    <div className="detail-nav">
      <Link href="/" className="back">← Newsroom</Link>
      <Link href="/activity" className="back">Activity trail</Link>
    </div>
    <article className="detail">
      <div className="meta"><span className="pill">{story.category}</span><span className="pill">{story.eventDate ?? "Date unknown"}</span><span className="pill">{story.location ?? "Location unknown"}</span><span className="pill">{field(story, "researchCompleteness", 0)}% researched</span></div>
      <h1>{story.workingTitle}</h1>
      <p className="lede">{story.summary}</p>
      <div className="dossier-actions">
        <a className="primary" href="#story">Read the story</a>
        <a className="secondary" href="#claims">Check citations</a>
        <a className="secondary" href="#sources">Source links</a>
        <Link className="secondary" href={beatHref}>Back to recommendations</Link>
      </div>
      <div className="scores"><Score n={story.interestScore} label="human interest"/><Score n={story.sourceScore} label="sources"/><Score n={story.competitionScore} label="originality"/><Score n={story.confidenceScore} label="confidence"/></div>

      <StorySection paragraphs={narrative} />
      {field(story, "premise") ? <Section title="Premise"><p>{field(story, "premise")}</p></Section> : null}
      {field(story, "narrativeHook") ? <Section title="Narrative hook"><p>{field(story, "narrativeHook")}</p></Section> : null}
      {field(story, "whyOverlooked") ? <Section title="Why it is overlooked"><p>{field(story, "whyOverlooked")}</p></Section> : null}
      {field(story, "originalityAssessment") ? <Section title="Originality assessment"><p>{field(story, "originalityAssessment")}</p></Section> : null}
      <ClaimCitations value={field(story, "claimCitations", [])} refs={refs} />
      <Section title="Chronology"><ol>{story.chronology?.map((x,i)=><li key={i}><b>{x.date}:</b> {x.event}</li>)}</ol></Section>
      <Section title="Key facts"><ul>{story.keyFacts?.map((x,i)=><li key={i}>{x}</li>)}</ul></Section>
      <Section title="Unresolved risks"><ul>{(arrayField(story, "unresolvedRisks").length ? arrayField(story, "unresolvedRisks") : story.conflicts)?.map((x,i)=><li key={i}>{x}</li>)}</ul></Section>
      <Section title="Video structure"><ol>{story.outline?.map((x,i)=><li key={i}><b>{x.heading}:</b> {x.notes}</li>)}</ol></Section>
      <Section title="Recommended next action"><p>{field(story, "recommendedNextAction", "Develop editorial treatment from the strongest cited claims.")}</p></Section>
      <EvidencePanel refs={refs} />
      <Section title="Sources" id="sources">{refs.length ? <ul>{refs.map(r=><li key={r.id}><a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>{r.publicationDate ? `, ${r.publicationDate}` : ""}</li>)}</ul> : <p>No cited sources were saved for this dossier.</p>}</Section>
    </article>
  </main>;
}

function StorySection({ paragraphs }: { paragraphs: string[] }) {
  return <section className="story-body" id="story">
    <p className="eyebrow">Story</p>
    {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
  </section>;
}

function EvidencePanel({ refs }: { refs: Array<{ id: string; title: string; url: string; publicationDate: string | null; sourceType: string }> }) {
  const visibleRefs = refs.slice(0, 4);
  return <section className="evidence-panel" aria-label="Evidence links">
    <div>
      <p className="eyebrow">Sources</p>
      <h2>Archive evidence</h2>
      <p>These are the records behind the story and citations. They open in a new tab.</p>
    </div>
    {visibleRefs.length ? <div className="source-buttons">
      {visibleRefs.map((ref) => <a className="secondary source-button" href={ref.url} target="_blank" rel="noreferrer" key={ref.id}>
        <span>{ref.sourceType}</span>
        <b>{ref.title}</b>
        {ref.publicationDate ? <small>{ref.publicationDate}</small> : null}
      </a>)}
      {refs.length > visibleRefs.length ? <a className="ghost" href="#sources">{refs.length - visibleRefs.length} more sources</a> : null}
    </div> : <p>No source links were saved for this dossier.</p>}
  </section>;
}

function ClaimCitations({ value, refs }: { value: unknown; refs: Array<{ archiveIdentifier: string | null; title: string; url: string }> }) {
  const claims = claimItems(value);
  if (!claims.length) return null;
  return <Section title="Claim-level citations" id="claims">
    <ol>{claims.map((claim, index) => <li key={index}>{claim.claim} {claim.sourceIds.map((sourceId) => {
      const ref = refs.find((item) => item.archiveIdentifier === sourceId || item.archiveIdentifier === stripSourcePrefix(sourceId));
      return ref ? <a className="cite" key={sourceId} href={ref.url} target="_blank" rel="noreferrer">[{ref.title}]</a> : <span className="cite" key={sourceId}>[{sourceId}]</span>;
    })}</li>)}</ol>
  </Section>;
}

function claimItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return typeof record.claim === "string" ? [{ claim: record.claim, sourceIds: Array.isArray(record.sourceIds) ? record.sourceIds.filter((id): id is string => typeof id === "string") : [] }] : [];
  });
}

function field<T>(value: unknown, key: string, fallback?: T) {
  if (!value || typeof value !== "object") return fallback;
  const found = (value as Record<string, unknown>)[key];
  return (found ?? fallback) as T;
}

function arrayField(value: unknown, key: string) {
  const found = field<unknown[]>(value, key, []);
  return Array.isArray(found) ? found.filter((item): item is string => typeof item === "string") : [];
}

function stripSourcePrefix(sourceId: string) {
  return sourceId.replace(/^(loc|internet_archive):/, "");
}

function Score({n,label}:{n:number;label:string}){return <div className="score"><b>{n}</b><span>{label}</span></div>}
function Section({title,children,id}:{title:string;children:React.ReactNode;id?:string}){return <section className="section" id={id}><h3>{title}</h3>{children}</section>}
