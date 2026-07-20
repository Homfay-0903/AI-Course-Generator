import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { courses, users } from '@/db/schema';

/**
 * GET /api/courses
 *
 * Query parameters:
 *   ?userId=uuid  — fetch all courses for a given user (most recent first)
 *   (no params)   — list all courses
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (userId) {
      const result = await db
        .select()
        .from(courses)
        .where(eq(courses.userId, userId))
        .orderBy(desc(courses.createdAt));

      return Response.json({ courses: result });
    }

    const allCourses = await db.select().from(courses);
    return Response.json({ courses: allCourses });
  } catch (error) {
    console.error('GET /api/courses error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/courses
 *
 * Creates a new course request. The user is looked up by email (from Clerk).
 * AI generation will be triggered asynchronously in a future iteration.
 *
 * Request body (JSON):
 *   { userEmail: string, title: string, description: string,
 *     difficulty: 'beginner' | 'intermediate' | 'advanced' }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userEmail: string;
      title: string;
      description: string;
      difficulty?: string;
    };

    // Validate required fields
    if (!body.userEmail || typeof body.userEmail !== 'string') {
      return Response.json(
        { error: 'userEmail is required and must be a string' },
        { status: 400 },
      );
    }

    if (!body.title || typeof body.title !== 'string') {
      return Response.json(
        { error: 'title is required and must be a string' },
        { status: 400 },
      );
    }

    if (!body.description || typeof body.description !== 'string') {
      return Response.json(
        { error: 'description is required and must be a string' },
        { status: 400 },
      );
    }

    const difficulty = body.difficulty ?? 'beginner';
    if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
      return Response.json(
        { error: 'difficulty must be one of: beginner, intermediate, advanced' },
        { status: 400 },
      );
    }

    // Look up the user by email
    const userResult = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.userEmail))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      return Response.json(
        { error: 'User not found. Please sign in first.' },
        { status: 404 },
      );
    }

    // Create the course (status: 'draft' — AI generation will be added later)
    const [newCourse] = await db
      .insert(courses)
      .values({
        userId: user.id,
        title: body.title,
        description: body.description,
        difficulty,
        status: 'draft',
      })
      .returning();

    return Response.json({ course: newCourse }, { status: 201 });
  } catch (error) {
    console.error('POST /api/courses error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
