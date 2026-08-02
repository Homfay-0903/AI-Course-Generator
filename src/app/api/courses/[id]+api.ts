import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { chapters, courses, lessons, users } from '@/db/schema';
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

    // Resolve the user for per-lesson completion annotations.
    let user = null;
    let completionSet: Set<string> | null = null;
    if (email) {
      const userRow = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      user = userRow[0] ?? null;
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

    const responseBody: Record<string, unknown> = {
      course,
      chapters: chaptersWithLessons,
    };

    if (user) {
      completionSet ??= await getCompletionSet(user.id, course.id);
      responseBody.progress = await getCourseProgress(user.id, course.id);
    }

    return Response.json(responseBody);
  } catch (error) {
    console.error('GET /api/courses/[id] error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
