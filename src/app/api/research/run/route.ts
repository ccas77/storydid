import { runResearch } from "@/lib/research/run";
import { isAuthorizedResearchRequest } from "@/lib/auth";
export const maxDuration = 300;
export async function POST(request: Request) {
  if (!isAuthorizedResearchRequest(request)) return new Response("Unauthorized", { status: 401 });
  try { return Response.json(await runResearch()); }
  catch (error) { return Response.json({ ok:false, error:error instanceof Error?error.message:String(error) }, {status:500}); }
}
