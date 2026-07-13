"use client";
import { useState } from "react";
import { Play, LoaderCircle } from "lucide-react";
export function RunButton() {
  const [state, setState] = useState<"idle"|"running"|"done"|"error">("idle");
  async function run() {
    setState("running");
    try { const r = await fetch("/api/research/run", { method: "POST" }); if (!r.ok) throw new Error(); setState("done"); window.location.reload(); } catch { setState("error"); }
  }
  return <button className="primary" onClick={run} disabled={state === "running"}>{state === "running" ? <LoaderCircle className="spin" size={16}/> : <Play size={16}/>} {state === "running" ? "Mining archives…" : state === "done" ? "Research complete" : state === "error" ? "Run failed" : "Run research now"}</button>;
}
