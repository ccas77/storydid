import { runResearch } from "@/lib/research/run";
export const maxDuration = 300;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", {status:401});
  try { return Response.json(await runResearch()); }
  catch (error) { return Response.json({ok:false,error:error instanceof Error?error.message:String(error)}, {status:500}); }
}
