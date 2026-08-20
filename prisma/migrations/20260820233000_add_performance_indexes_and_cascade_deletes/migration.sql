-- Migration: 20260820233000_add_performance_indexes_and_cascade_deletes
-- Adds missing performance indexes on foreign keys & frequent query paths,
-- and aligns onDelete: Cascade across course hierarchy.

-- 1. Create Performance Indexes
CREATE INDEX IF NOT EXISTS "courses_owner_id_idx" ON "courses"("owner_id");
CREATE INDEX IF NOT EXISTS "courses_source_id_idx" ON "courses"("source_id");

CREATE INDEX IF NOT EXISTS "chapters_course_id_idx" ON "chapters"("course_id");

CREATE INDEX IF NOT EXISTS "lessons_chapter_id_idx" ON "lessons"("chapter_id");
CREATE INDEX IF NOT EXISTS "lessons_source_id_idx" ON "lessons"("source_id");
CREATE INDEX IF NOT EXISTS "lessons_ai_generation_id_idx" ON "lessons"("ai_generation_id");

CREATE INDEX IF NOT EXISTS "notes_course_id_idx" ON "notes"("course_id");

CREATE INDEX IF NOT EXISTS "learning_progress_user_id_course_id_idx" ON "learning_progress"("user_id", "course_id");
CREATE INDEX IF NOT EXISTS "learning_progress_course_id_idx" ON "learning_progress"("course_id");

CREATE INDEX IF NOT EXISTS "questions_lesson_id_idx" ON "questions"("lesson_id");

-- 2. Update Foreign Key Constraints to CASCADE / SET NULL
-- courses
ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "courses_owner_id_fkey";
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- chapters
ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "chapters_course_id_fkey";
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- lessons
ALTER TABLE "lessons" DROP CONSTRAINT IF EXISTS "lessons_chapter_id_fkey";
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- questions
ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "questions_lesson_id_fkey";
ALTER TABLE "questions" ADD CONSTRAINT "questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- notes
ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "notes_user_id_fkey";
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "notes_lesson_id_fkey";
ALTER TABLE "notes" ADD CONSTRAINT "notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "notes_course_id_fkey";
ALTER TABLE "notes" ADD CONSTRAINT "notes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- learning_progress
ALTER TABLE "learning_progress" DROP CONSTRAINT IF EXISTS "learning_progress_lesson_id_fkey";
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_progress" DROP CONSTRAINT IF EXISTS "learning_progress_user_id_fkey";
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_progress" DROP CONSTRAINT IF EXISTS "learning_progress_course_id_fkey";
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
