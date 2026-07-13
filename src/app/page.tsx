import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { stories } from "@/db/schema";
import { demoStories } from "@/lib/demo";
import { RunButton } from "@/components/run-button";

export const dynamic = "force-dynamic";
export default async function Home() {
  const db = getDb();
  const rows = db ? await db.select().from(stories).orderBy(desc(stories.createdAt)).limit(30) : demoStories;
  const avg = (key: "interestScore"|"sourceScore"|"competitionScore"|"confidenceScore") => Math.round(rows.reduce((s,r)=>s+(r[key]??0),0)/Math.max(rows.length,1));
  return <main className="shell"><header className="top"><div><div className="brand">StoryDid</div><div className="sub">Historical stories, evidence first.</div></div><RunButton/></header>
    <section className="stats"><div className="stat"><strong>{rows.length}</strong><span>research dossiers</span></div><div className="stat"><strong>{avg("interestScore")}</strong><span>average interest</span></div><div className="stat"><strong>{avg("sourceScore")}</strong><span>source strength</span></div><div className="stat"><strong>{avg("competitionScore")}</strong><span>low-competition score</span></div></section>
    <section className="grid">{rows.map((story) => <Link className="card" href={`/stories/${story.id}`} key={story.id}><div className="meta"><span className="pill">{story.category}</span><span className="pill">{story.eventDate ?? "Date unknown"}</span><span className="pill">{story.location ?? "Location unknown"}</span></div><h2>{story.workingTitle}</h2><p>{story.summary}</p><div className="scores"><Score n={story.interestScore} label="interest"/><Score n={story.sourceScore} label="sources"/><Score n={story.competitionScore} label="low competition"/><Score n={story.confidenceScore} label="confidence"/></div></Link>)}</section>
  </main>;
}
function Score({n,label}:{n:number;label:string}){return <div className="score"><b>{n}</b><span>{label}</span></div>}
