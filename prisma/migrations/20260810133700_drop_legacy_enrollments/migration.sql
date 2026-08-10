-- WP1.6 follow-up cleanup: the `enrollments` table (marketplace-era
-- STUDENT-enrolls-in-course model) has had zero writes since the ownership
-- pivot (WP0.2) and zero reads since WP1.6.2/1.6.3 moved /my-learning and the
-- enroll write-path off it. Confirmed empty (0 rows) and confirmed
-- learning_progress.enrollment_id is 0-populated before dropping.

-- Drop the FK from learning_progress to enrollments first.
ALTER TABLE "learning_progress" DROP CONSTRAINT IF EXISTS "learning_progress_enrollment_id_fkey";

-- Drop the now-unused column.
ALTER TABLE "learning_progress" DROP COLUMN IF EXISTS "enrollment_id";

-- Drop the orphaned table itself.
DROP TABLE IF EXISTS "enrollments";
