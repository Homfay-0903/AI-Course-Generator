import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';

/**
 * GET /api/user
 *
 * Query parameters:
 *   ?email=user@example.com  — fetch a single user by email
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
 *   { email: string, name?: string, avatarUrl?: string }
 */
export async function POST(request: Request) {
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
