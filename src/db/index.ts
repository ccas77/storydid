import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
let client: ReturnType<typeof drizzle<typeof schema>> | null = null;
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL?.replace(/^"|"$/g, "").trim();
  if (!databaseUrl) return null;
  if (!client) client = drizzle(neon(databaseUrl), { schema });
  return client;
}
