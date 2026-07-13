import { runResearch } from "@/lib/research/run";
export const maxDuration = 300;
export async function POST() {
  try { return Response.json(await runResearch()); }
  catch (error) { return Response.json({ ok:false, error:error instanceof Error?error.message:String(error) }, {status:500}); }
}
