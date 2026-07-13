import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { sources, stories } from "@/db/schema";
import { demoStories } from "@/lib/demo";
export const dynamic = "force-dynamic";
export default async function StoryPage({params}:{params:Promise<{id:string}>}) {
  const { id } = await params; const db = getDb();
  const story = db ? (await db.select().from(stories).where(eq(stories.id,id)).limit(1).catch(() => []))[0] ?? demoStories.find(s=>s.id===id) : demoStories.find(s=>s.id===id);
  if(!story) notFound();
  const refs = db ? await db.select().from(sources).where(eq(sources.storyId,id)).catch(() => []) : [];
  return <main className="shell"><Link href="/" className="back">← All dossiers</Link><div className="detail"><div className="meta"><span className="pill">{story.category}</span><span className="pill">{story.eventDate}</span><span className="pill">{story.location}</span></div><h1>{story.workingTitle}</h1><p>{story.summary}</p><div className="scores"><Score n={story.interestScore} label="interest"/><Score n={story.sourceScore} label="sources"/><Score n={story.competitionScore} label="low competition"/><Score n={story.confidenceScore} label="confidence"/></div>
  <Section title="Chronology"><ol>{story.chronology?.map((x,i)=><li key={i}><b>{x.date}:</b> {x.event}</li>)}</ol></Section>
  <Section title="Key facts"><ul>{story.keyFacts?.map((x,i)=><li key={i}>{x}</li>)}</ul></Section>
  <Section title="Conflicts and gaps"><ul>{story.conflicts?.map((x,i)=><li key={i}>{x}</li>)}</ul></Section>
  <Section title="Possible titles"><ul>{story.titles?.map((x,i)=><li key={i}>{x}</li>)}</ul></Section>
  <Section title="Video structure"><ol>{story.outline?.map((x,i)=><li key={i}><b>{x.heading}:</b> {x.notes}</li>)}</ol></Section>
  <Section title="Sources">{refs.length ? <ul>{refs.map(r=><li key={r.id}><a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>{r.publicationDate ? `, ${r.publicationDate}` : ""}</li>)}</ul> : <p>Demo mode. Configure DATABASE_URL and run research to attach live archive sources.</p>}</Section>
  </div></main>
}
function Score({n,label}:{n:number;label:string}){return <div className="score"><b>{n}</b><span>{label}</span></div>}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="section"><h3>{title}</h3>{children}</section>}
