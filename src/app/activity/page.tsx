import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { researchActivity, researchRuns } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const db = getDb();
  const events = db ? await db.select().from(researchActivity).orderBy(desc(researchActivity.createdAt)).limit(120).catch(() => []) : [];
  const runs = db ? await db.select().from(researchRuns).orderBy(desc(researchRuns.startedAt)).limit(8).catch(() => []) : [];

  return <main className="shell">
    <header className="top">
      <div>
        <Link href="/" className="back">← Recommendations</Link>
        <h1>Research Activity</h1>
        <p className="lede">What the autonomous research agent searched, decided, rejected, merged, and developed.</p>
      </div>
    </header>
    <section className="stats">
      <div className="stat"><strong>{runs.length}</strong><span>recent runs</span></div>
      <div className="stat"><strong>{events.filter((event) => event.kind === "search").length}</strong><span>search events</span></div>
      <div className="stat"><strong>{events.filter((event) => event.kind === "rejected").length}</strong><span>rejections</span></div>
      <div className="stat"><strong>{events.filter((event) => event.kind === "recommended").length}</strong><span>recommendations</span></div>
    </section>
    <section className="timeline">
      {events.length ? events.map((event) => <article className="event" key={event.id}>
        <div className="event-kind">{event.kind.replaceAll("_", " ")}</div>
        <div>
          <h2>{event.title}</h2>
          <p>{event.detail}</p>
          <time>{event.createdAt.toLocaleString()}</time>
        </div>
      </article>) : <div className="empty"><h2>No activity yet</h2><p>The next scheduled discovery run will write a full decision trail here.</p></div>}
    </section>
  </main>;
}
