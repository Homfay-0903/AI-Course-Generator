import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';

/**
 * GET /api/user
 *
 * Query parameters:
 *   ?email=user@example.com  — fetch a single user by email (includes game stats)
 *   (no params)              — list all users
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (email) {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      const user = result[0] ?? null;

      if (!user) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      return Response.json({ user });
    }

    const allUsers = await db.select().from(users);
    return Response.json({ users: allUsers });
  } catch (error) {
    console.error('GET /api/user error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/user
 *
 * Creates a new user.
 *
 * Request body (JSON):
 *   { email: string, name?: string, avatarUrl?: string,
 *     xp?: number, coins?: number, level?: number }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email: string;
      name?: string;
      avatarUrl?: string;
      xp?: number;
      coins?: number;
      level?: number;
    };

    if (!body.email || typeof body.email !== 'string') {
      return Response.json(
        { error: 'email is required and must be a string' },
        { status: 400 },
      );
    }

    // Check for existing user with same email
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existing.length > 0) {
      return Response.json(
        { error: 'A user with this email already exists' },
        { status: 409 },
      );
    }

    const [newUser] = await db
      .insert(users)
      .values({
        email: body.email,
        name: body.name ?? null,
        avatarUrl: body.avatarUrl ?? null,
        xp: body.xp ?? 0,
        coins: body.coins ?? 0,
        level: body.level ?? 1,
      })
      .returning();

    return Response.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('POST /api/user error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/user
 *
 * Upsert (sync) a user by email — used when a Clerk-authenticated user
 * first lands on the camp page. Creates the DB record if it doesn't exist;
 * returns the existing record if it does.
 *
 * Request body (JSON):
 *   { email: string, name?: string, avatarUrl?: string }
 */
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      email: string;
      name?: string;
      avatarUrl?: string;
    };

    if (!body.email || typeof body.email !== 'string') {
      return Response.json(
        { error: 'email is required and must be a string' },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existing.length > 0) {
      // User exists — optionally update name/avatar if newer
      const current = existing[0];
      const name = body.name ?? current.name;
      const avatarUrl = body.avatarUrl ?? current.avatarUrl;

      if (name !== current.name || avatarUrl !== current.avatarUrl) {
        const [updated] = await db
          .update(users)
          .set({ name, avatarUrl, updatedAt: new Date() })
          .where(eq(users.id, current.id))
          .returning();

        return Response.json({ user: updated });
      }

      return Response.json({ user: current });
    }

    // Create new user with default game stats
    const [newUser] = await db
      .insert(users)
      .values({
        email: body.email,
        name: body.name ?? null,
        avatarUrl: body.avatarUrl ?? null,
        xp: 0,
        coins: 0,
        level: 1,
      })
      .returning();

    return Response.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('PUT /api/user error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
