import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

/**
 * Drizzle client singleton.
 *
 * Uses the neon-http driver — each query is a single HTTP request to
 * NeonDB's serverless endpoint. No TCP connection pool required.
 *
 * DATABASE_URL is a server-side env var loaded by Expo Metro for API
 * Route code. It must NOT have the EXPO_PUBLIC_ prefix (which would
 * embed it in the client bundle).
 */
function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

/**
 * Convenience default export — lazily initialised via Proxy so the
 * actual connection is only created when a query is first executed,
 * not at module import time.
 *
 * Usage in API routes:
 *   import { db } from '@/db';
 *   const users = await db.select().from(users);
 */
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
