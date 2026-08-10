-- WP1.6 follow-up cleanup: `courses.lecturer_id` was a marketplace-era
-- duplicate of `owner_id` (a course's "author" vs its "owner" — a distinction
-- the ownership model never actually uses). Every write path in the codebase
-- already sets both columns to the same value; confirmed 0 rows where they
-- differ before dropping. `owner_id` is now the sole identity field.

ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "courses_lecturer_id_fkey";
ALTER TABLE "courses" DROP COLUMN IF EXISTS "lecturer_id";
