import { useCallback, useState } from 'react';

import type { CourseDialogData } from '@/components/game/course-dialog';
import {
  createCourseAndGenerate,
  retryCourseGeneration,
  type CreateCourseCallbacks,
} from '@/lib/create-course';

export type CourseGenerationOverlay = {
  visible: boolean;
  message: string;
};

/**
 * Drives the full-screen LoadingOverlay across AI course generation.
 *
 * `create-course.ts` fires `onDone` right after the generate call is triggered
 * (while polling still runs), so it cannot dismiss the overlay. The overlay is
 * only closed on the true terminal signals: `onCourseUpdated` (ready),
 * `setCourseStatus(id, 'failed')` (GLM failure or the 10-min poll timeout),
 * and `onError`. `dialogLoading` mirrors the old `onDone` timing to release
 * the course dialog's submit button early.
 */
export function useCourseGeneration() {
  const [overlay, setOverlay] = useState<CourseGenerationOverlay>({
    visible: false,
    message: '',
  });
  const [dialogLoading, setDialogLoading] = useState(false);

  const finish = useCallback(() => {
    setOverlay((o) => ({ ...o, visible: false }));
  }, []);

  const runCreate = useCallback(
    (userEmail: string, data: CourseDialogData, cb: CreateCourseCallbacks) => {
      setDialogLoading(true);
      setOverlay({ visible: true, message: '正在生成课程，请稍候…' });
      createCourseAndGenerate(userEmail, data, {
        onCourseCreated: cb.onCourseCreated,
        setCourseStatus: (id, status) => {
          cb.setCourseStatus(id, status);
          if (status === 'failed') finish();
        },
        onCourseUpdated: (course) => {
          cb.onCourseUpdated(course);
          finish();
        },
        onError: (title, message) => {
          cb.onError(title, message);
          finish();
        },
        onDone: () => {
          cb.onDone();
          setDialogLoading(false);
        },
      });
    },
    [finish],
  );

  const runRetry = useCallback(
    (userEmail: string, courseId: string, cb: CreateCourseCallbacks) => {
      setOverlay({ visible: true, message: '正在重新生成课程，请稍候…' });
      retryCourseGeneration(userEmail, courseId, {
        onCourseCreated: cb.onCourseCreated,
        setCourseStatus: (id, status) => {
          cb.setCourseStatus(id, status);
          if (status === 'failed') finish();
        },
        onCourseUpdated: (course) => {
          cb.onCourseUpdated(course);
          finish();
        },
        onError: (title, message) => {
          cb.onError(title, message);
          finish();
        },
        onDone: () => cb.onDone(),
      });
    },
    [finish],
  );

  return { overlay, dialogLoading, runCreate, runRetry };
}
