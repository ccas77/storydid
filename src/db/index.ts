import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
let client: ReturnType<typeof drizzle<typeof schema>> | null = null;
export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!client) client = drizzle(neon(process.env.DATABASE_URL), { schema });
  return client;
}
