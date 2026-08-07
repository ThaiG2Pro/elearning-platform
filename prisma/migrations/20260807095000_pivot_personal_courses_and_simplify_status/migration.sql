-- AlterTable
-- owner_id is added nullable first and backfilled from the existing
-- lecturer_id so this migration is safe to run against a non-empty
-- courses table, then tightened to NOT NULL.
ALTER TABLE "courses" DROP COLUMN "reject_note",
DROP COLUMN "submitted_at",
ADD COLUMN     "owner_id" BIGINT,
ADD COLUMN     "share_token" VARCHAR(100),
ALTER COLUMN "status" SET DEFAULT 'active';

UPDATE "courses" SET "owner_id" = "lecturer_id" WHERE "owner_id" IS NULL;

ALTER TABLE "courses" ALTER COLUMN "owner_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "enrollments" ALTER COLUMN "completion_rate" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "learning_progress" ADD COLUMN     "course_id" BIGINT,
ADD COLUMN     "user_id" BIGINT,
ALTER COLUMN "is_finished" SET DEFAULT false;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "source_id" BIGINT;

-- AlterTable
ALTER TABLE "questions" ALTER COLUMN "answer_key" DROP NOT NULL;

-- CreateTable
CREATE TABLE "sources" (
    "id" BIGSERIAL NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "normalized_url" VARCHAR(1000) NOT NULL,
    "title" VARCHAR(255),
    "type" VARCHAR(50) NOT NULL,
    "metadata" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_url_key" ON "sources"("url");

-- CreateIndex
CREATE UNIQUE INDEX "sources_normalized_url_key" ON "sources"("normalized_url");

-- CreateIndex
CREATE UNIQUE INDEX "courses_share_token_key" ON "courses"("share_token");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

