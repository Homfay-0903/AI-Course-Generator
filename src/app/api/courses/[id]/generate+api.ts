import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { chapters, courses, lessons, users } from '@/db/schema';
import { generateCourseContent } from '@/lib/glm';

/**
 * POST /api/courses/[id]/generate
 *
 * Triggers AI course generation via GLM for the given course.
 *
 * Request body (JSON):
 *   { userEmail: string }
 *
 * The userEmail is used to verify ownership — only the course owner
 * can trigger generation.
 *
 * Flow:
 *   1. Verify course exists and belongs to user
 *   2. Set status → 'generating'
 *   3. Call GLM to generate chapters + lessons + icon
 *   4. Write generated content to DB
 *   5. Set status → 'ready', store icon
 */
export async function POST(request: Request) {
  // Extract course ID from URL path: /api/courses/{id}/generate
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.indexOf('courses') + 1];

  if (!id) {
    return Response.json(
      { error: 'Course ID is required in the URL path' },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as {
      userEmail?: string;
    };

    const userEmail = body.userEmail;
    if (!userEmail || typeof userEmail !== 'string') {
      return Response.json(
        { error: 'userEmail is required' },
        { status: 400 },
      );
    }

    // Verify the course exists and belongs to this user
    const courseResult = await db
      .select({
        course: courses,
        user: users,
      })
      .from(courses)
      .innerJoin(users, eq(courses.userId, users.id))
      .where(and(eq(courses.id, id), eq(users.email, userEmail)))
      .limit(1);

    const row = courseResult[0];
    if (!row) {
      return Response.json(
        { error: 'Course not found or access denied' },
        { status: 404 },
      );
    }

    const course = row.course;

    if (course.status === 'generating') {
      return Response.json(
        { error: 'Course generation is already in progress' },
        { status: 409 },
      );
    }

    // ── Step 1: Mark as generating ───────────────────────
    await db
      .update(courses)
      .set({ status: 'generating', updatedAt: new Date() })
      .where(eq(courses.id, id));

    // ── Step 2: Call GLM to generate content ─────────────
    let generated;
    try {
      generated = await generateCourseContent(
        course.description,
        course.difficulty,
      );
    } catch (error) {
      // Mark as failed so the user can retry
      await db
        .update(courses)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(courses.id, id));

      const message =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('GLM generation failed for course', id, ':', message);
      return Response.json(
        { error: `AI 生成失败：${message}` },
        { status: 502 },
      );
    }

    // ── Step 3: Write chapters and lessons to DB ─────────
    let chapterOrder = 0;
    for (const genChapter of generated.chapters) {
      const [savedChapter] = await db
        .insert(chapters)
        .values({
          courseId: id,
          title: genChapter.title,
          description: genChapter.description ?? null,
          order: chapterOrder,
        })
        .returning();

      if (!savedChapter) continue;

      let lessonOrder = 0;
      for (const genLesson of genChapter.lessons) {
        await db.insert(lessons).values({
          chapterId: savedChapter.id,
          title: genLesson.title,
          content: genLesson.content,
          order: lessonOrder,
        });
        lessonOrder++;
      }
      chapterOrder++;
    }

    // ── Step 4: Mark as ready ────────────────────────────
    const [updatedCourse] = await db
      .update(courses)
      .set({
        status: 'ready',
        icon: generated.icon,
        title: course.title, // keep original title (user's summary)
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id))
      .returning();

    return Response.json({ course: updatedCourse }, { status: 200 });
  } catch (error) {
    console.error('POST /api/courses/[id]/generate error:', error);

    // Attempt to mark as failed on unexpected errors
    try {
      await db
        .update(courses)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(courses.id, id));
    } catch {
      // Best effort — ignore
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
