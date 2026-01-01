/*
  Warnings:

  - You are about to drop the column `sort_order` on the `chapters` table. All the data in the column will be lost.
  - You are about to drop the column `video_url` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `activation_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lesson_progresses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notes` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `courses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order_index` to the `chapters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `courses` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `completion_rate` to the `enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_index` to the `lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option_a` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option_b` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option_c` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option_d` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `full_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "activation_tokens" DROP CONSTRAINT "activation_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "lesson_progresses" DROP CONSTRAINT "lesson_progresses_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "lesson_progresses" DROP CONSTRAINT "lesson_progresses_student_id_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_student_id_fkey";

-- AlterTable
ALTER TABLE "chapters" DROP COLUMN "sort_order",
ADD COLUMN     "order_index" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "description" TEXT,
ADD COLUMN     "slug" VARCHAR(255) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "completion_rate" INTEGER NOT NULL,
ALTER COLUMN "enrolled_at" DROP NOT NULL,
ALTER COLUMN "enrolled_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lessons" DROP COLUMN "video_url",
ADD COLUMN     "content_url" VARCHAR(500),
ADD COLUMN     "order_index" INTEGER NOT NULL,
ADD COLUMN     "type" VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "option_a" VARCHAR(255) NOT NULL,
ADD COLUMN     "option_b" VARCHAR(255) NOT NULL,
ADD COLUMN     "option_c" VARCHAR(255) NOT NULL,
ADD COLUMN     "option_d" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "role",
ADD COLUMN     "avatar_url" VARCHAR(500),
ADD COLUMN     "created_at" TIMESTAMP(6),
ADD COLUMN     "full_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "password_hash" VARCHAR(255) NOT NULL,
ADD COLUMN     "role_id" INTEGER NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(20) NOT NULL;

-- DropTable
DROP TABLE "activation_tokens";

-- DropTable
DROP TABLE "lesson_progresses";

-- DropTable
DROP TABLE "notes";

-- DropEnum
DROP TYPE "CourseStatus";

-- DropEnum
DROP TYPE "UserRole";

-- DropEnum
DROP TYPE "UserStatus";

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(20) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "code" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "is_used" BOOLEAN NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_progress" (
    "id" BIGSERIAL NOT NULL,
    "enrollment_id" BIGINT NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "is_finished" BOOLEAN NOT NULL,
    "video_last_position" INTEGER,
    "quiz_max_score" INTEGER,
    "personal_note" TEXT,

    CONSTRAINT "learning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_code_key" ON "tokens"("code");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
