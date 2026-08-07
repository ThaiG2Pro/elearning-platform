-- WP1.5.12: "Sao chép về học" (share/[token] clone) had no idempotency guard —
-- a double-submit (double-click, double-fired effect, two tabs) created two
-- identical copies of the shared course in the visitor's account. Track which
-- course a clone came from so cloneForOwner can dedupe by (owner, source).
ALTER TABLE "courses" ADD COLUMN "cloned_from_course_id" BIGINT;

-- Postgres treats NULL as distinct for unique constraints, so owner-authored
-- courses (cloned_from_course_id = NULL) are unaffected — only real clones
-- are constrained to one per (owner, source) pair.
CREATE UNIQUE INDEX "courses_owner_id_cloned_from_course_id_key" ON "courses"("owner_id", "cloned_from_course_id");
