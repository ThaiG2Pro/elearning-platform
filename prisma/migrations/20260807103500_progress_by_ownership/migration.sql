-- WP1.3: progress tracking must key off ownership (user_id + lesson_id),
-- not the marketplace enrollment row. enrollment_id becomes optional —
-- kept only for rows written before this pivot.
ALTER TABLE "learning_progress" ALTER COLUMN "enrollment_id" DROP NOT NULL;

-- Postgres treats NULL as distinct for unique constraints, so this is safe
-- even though every pre-pivot row currently has user_id = NULL.
CREATE UNIQUE INDEX "learning_progress_user_id_lesson_id_key" ON "learning_progress"("user_id", "lesson_id");
