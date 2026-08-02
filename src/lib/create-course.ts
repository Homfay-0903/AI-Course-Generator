import type { ActiveCourse } from '@/components/game/active-courses';
import type { CourseDialogData } from '@/components/game/course-dialog';

/**
 * Shared client-side course creation flow (used by Home and Missions):
 *   1. POST /api/courses → draft course added to the list immediately
 *   2. POST /api/courses/:id/generate → status 'generating' (202, async)
 *   3. Poll GET /api/courses/:id until 'ready' or 'failed'
 *
 * Module-scope functions keep `Date.now()`/`setTimeout` out of component
 * render bodies (react-hooks purity rule).
 */

export interface CreateCourseCallbacks {
  /** Called with the created draft course — add it to the list. */
  onCourseCreated: (course: ActiveCourse) => void;
  /** Called to patch a course's status (generating / failed). */
  setCourseStatus: (id: string, status: ActiveCourse['status']) => void;
  /** Called with the refreshed course once generation reaches 'ready'. */
  onCourseUpdated: (course: ActiveCourse) => void;
  /** Called on any error (title, message) — components render an Alert. */
  onError: (title: string, message: string) => void;
  /** Called when the whole flow finishes (success or failure). */
  onDone: () => void;
}

const POLL_INTERVAL = 5000; // 5 seconds
const POLL_TIMEOUT = 600_000; // 10 minutes

export async function createCourseAndGenerate(
  userEmail: string,
  data: CourseDialogData,
  cb: CreateCourseCallbacks,
): Promise<void> {
  // Step 1: Create the course (status: 'draft')
  let course: ActiveCourse;
  try {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail,
        title: data.description.slice(0, 50),
        description: data.description,
        difficulty: data.difficulty,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      cb.onError('创建失败', err.error ?? '请稍后重试');
      cb.onDone();
      return;
    }

    const result = await res.json();
    course = result.course;
  } catch {
    cb.onError('网络错误', '请检查网络连接后重试');
    cb.onDone();
    return;
  }

  // Add course to list immediately (status: 'draft')
  cb.onCourseCreated(course);

  // Step 2: Trigger AI generation (async — returns 202 immediately)
  cb.setCourseStatus(course.id, 'generating');
  try {
    const genRes = await fetch(`/api/courses/${course.id}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail }),
    });

    if (!genRes.ok) {
      const err = await genRes.json();
      cb.setCourseStatus(course.id, 'failed');
      cb.onError('生成失败', err.error ?? 'AI 生成课程内容失败，请稍后重试');
      cb.onDone();
      return;
    }

    // Generation started — begin polling for completion
    pollCourseStatus(course.id, cb);
  } catch {
    cb.setCourseStatus(course.id, 'failed');
    cb.onError('网络错误', '请检查网络连接后重试');
  } finally {
    cb.onDone();
  }
}

/** Retry AI generation for an existing course (status → 'generating', then poll). */
export async function retryCourseGeneration(
  userEmail: string,
  courseId: string,
  cb: CreateCourseCallbacks,
): Promise<void> {
  try {
    const genRes = await fetch(`/api/courses/${courseId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail }),
    });

    if (!genRes.ok) {
      const err = await genRes.json();
      cb.setCourseStatus(courseId, 'failed');
      cb.onError('生成失败', err.error ?? 'AI 生成课程内容失败，请稍后重试');
      cb.onDone();
      return;
    }

    cb.setCourseStatus(courseId, 'generating');
    pollCourseStatus(courseId, cb);
  } catch {
    cb.setCourseStatus(courseId, 'failed');
    cb.onError('网络错误', '请检查网络连接后重试');
  } finally {
    cb.onDone();
  }
}

/** Poll a course until generation completes (status → ready or failed). */
export function pollCourseStatus(courseId: string, cb: CreateCourseCallbacks): void {
  const startedAt = Date.now();

  const poll = async () => {
    if (Date.now() - startedAt > POLL_TIMEOUT) {
      cb.setCourseStatus(courseId, 'failed');
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) {
        setTimeout(poll, POLL_INTERVAL);
        return;
      }

      const { course: current } = await res.json();
      if (!current) {
        setTimeout(poll, POLL_INTERVAL);
        return;
      }

      if (current.status === 'ready') {
        cb.onCourseUpdated(current);
        return;
      }

      if (current.status === 'failed') {
        cb.setCourseStatus(courseId, 'failed');
        return;
      }

      // Still generating — poll again
      setTimeout(poll, POLL_INTERVAL);
    } catch {
      // On error, keep polling
      setTimeout(poll, POLL_INTERVAL);
    }
  };

  // Start first poll after a short delay (give the server a moment)
  setTimeout(poll, POLL_INTERVAL);
}
