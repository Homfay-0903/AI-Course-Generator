import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * User table.
 *
 * id is a UUID v4 generated at insert time via crypto.randomUUID().
 * This runs server-side (Node.js via Expo API Routes), not in the
 * React Native runtime, so crypto.randomUUID() is available.
 *
 * updatedAt does not use $onUpdate because the neon-http driver does
 * not support driver-level update hooks. Callers must set updatedAt
 * explicitly on UPDATE queries.
 */
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Full user row as returned by SELECT. */
export type User = typeof users.$inferSelect;

/** Shape for inserting a new user (columns with defaults are optional). */
export type NewUser = typeof users.$inferInsert;
