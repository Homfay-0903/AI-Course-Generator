import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { chapters, courses, lessons } from '@/db/schema';

/**
 * GET /api/courses/[id]
 *
 * Returns a single course with its chapters and lessons nested.
 *
 * Response shape:
 *   {
 *     course: { ...course },
 *     chapters: [
 *       { ...chapter, lessons: [{ ...lesson }] }
 *     ]
 *   }
 */
export async function GET(request: Request) {
  // Extract course ID from URL path: /api/courses/{id}
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
          lessons: lessonRows,
        };
      }),
    );

    return Response.json({
      course,
      chapters: chaptersWithLessons,
    });
  } catch (error) {
    console.error('GET /api/courses/[id] error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
