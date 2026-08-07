-- WP1.5.4: notes used to "ride" on learning_progress.personal_note — exactly
-- one note per (user, lesson), no timestamp, no delete. Give notes their own
-- table so a lesson can have many notes, each optionally pinned to a video
-- timestamp (click a note -> seek player there).
CREATE TABLE "notes" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "video_timestamp_sec" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notes_user_id_lesson_id_idx" ON "notes"("user_id", "lesson_id");

ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: carry over any existing single-note-per-lesson data from
-- learning_progress.personal_note so nobody's existing note disappears.
INSERT INTO "notes" ("user_id", "lesson_id", "course_id", "content", "created_at", "updated_at")
SELECT lp.user_id, lp.lesson_id, c.id, lp.personal_note, now(), now()
FROM "learning_progress" lp
JOIN "lessons" les ON les.id = lp.lesson_id
JOIN "chapters" c ON c.id = les.chapter_id
WHERE lp.personal_note IS NOT NULL AND lp.user_id IS NOT NULL;
