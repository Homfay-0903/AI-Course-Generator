import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { chapters, courses, lessonCompletions, lessons, users } from '@/db/schema';
import { getCompletionSet, getCourseProgress } from '@/lib/game';

/**
 * GET /api/courses/[id]
 *
 * Returns a single course with its chapters and lessons nested.
 *
 * Query parameters:
 *   ?email=user@example.com  — optional; when provided, each lesson is
 *     annotated with `completed` and a top-level `progress` object is added.
 *
 * Response shape:
 *   {
 *     course: { ...course },
 *     chapters: [
 *       { ...chapter, lessons: [{ ...lesson, completed: boolean }] }
 *     ],
 *     progress?: { completedLessons, totalLessons, percent }
 *   }
 */
export async function GET(request: Request) {
  // Extract course ID from URL path: /api/courses/{id}
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.indexOf('courses') + 1];
  const email = url.searchParams.get('email');

  if (!id) {
    return Response.json(
      { error: 'Course ID is required in the URL path' },
      { status: 400 },
    );
  }

  try {
    // Fetch the course
    const courseResult = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);

    const course = courseResult[0];
    if (!course) {
      return Response.json({ error: 'Course not found' }, { status: 404 });
    }

    const responseBody: Record<string, unknown> = {
      course,
    };

    // Resolve the user for per-lesson completion annotations.
    let completionSet: Set<string> | null = null;
    if (email) {
      const userRow = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      const user = userRow[0] ?? null;
      if (user) {
        completionSet = await getCompletionSet(user.id, course.id);
        responseBody.progress = await getCourseProgress(user.id, course.id);
      }
    }

    // Fetch chapters for this course, ordered by `order`
    const chapterRows = await db
      .select()
      .from(chapters)
      .where(eq(chapters.courseId, id))
      .orderBy(asc(chapters.order));

    // Fetch lessons for each chapter
    const chaptersWithLessons = await Promise.all(
      chapterRows.map(async (chapter) => {
        const lessonRows = await db
          .select()
          .from(lessons)
          .where(eq(lessons.chapterId, chapter.id))
          .orderBy(asc(lessons.order));

        return {
          ...chapter,
          lessons: lessonRows.map((lesson) => ({
            ...lesson,
            completed: completionSet?.has(lesson.id) ?? false,
          })),
        };
      }),
    );

    responseBody.chapters = chaptersWithLessons;

    return Response.json(responseBody);
  } catch (error) {
    console.error('GET /api/courses/[id] error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/courses/[id]
 *
 * Deletes a course and its dependent rows (chapters, lessons, and any
 * lesson completions). The schema uses plain FK references (no ON DELETE
 * CASCADE), so the rows must be removed in order: lesson_completions →
 * lessons → chapters → course.
 *
 * Query parameters:
 *   ?email=user@example.com  — the owner's email (required for ownership check)
 */
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.indexOf('courses') + 1];
  const email = url.searchParams.get('email');

  if (!id) {
    return Response.json(
      { error: 'Course ID is required in the URL path' },
      { status: 400 },
    );
  }

  if (!email) {
    return Response.json(
      { error: 'email query parameter is required' },
      { status: 400 },
    );
  }

  try {
    // Verify the course exists and belongs to this user
    const courseResult = await db
      .select({ id: courses.id })
      .from(courses)
      .innerJoin(users, eq(courses.userId, users.id))
      .where(and(eq(courses.id, id), eq(users.email, email)))
      .limit(1);

    if (!courseResult[0]) {
      return Response.json(
        { error: 'Course not found or access denied' },
        { status: 404 },
      );
    }

    // Cascade delete: lesson_completions → lessons → chapters → course
    const chapterRows = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.courseId, id));

    const chapterIds = chapterRows.map((c) => c.id);
    if (chapterIds.length > 0) {
      const lessonRows = await db
        .select({ id: lessons.id })
        .from(lessons)
        .where(inArray(lessons.chapterId, chapterIds));

      const lessonIds = lessonRows.map((l) => l.id);
      if (lessonIds.length > 0) {
        await db
          .delete(lessonCompletions)
          .where(inArray(lessonCompletions.lessonId, lessonIds));
      }

      await db.delete(lessons).where(inArray(lessons.chapterId, chapterIds));
      await db.delete(chapters).where(eq(chapters.courseId, id));
    }

    await db.delete(courses).where(eq(courses.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/courses/[id] error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
