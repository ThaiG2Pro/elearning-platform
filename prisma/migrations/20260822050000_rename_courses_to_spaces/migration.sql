-- Domain rename: course → space (terminology pivot, "Space" là tên sản phẩm
-- chính thức của không gian học). Pure RENAME — giữ nguyên toàn bộ data,
-- index và FK; đổi luôn tên constraint/index về chuẩn Prisma của tên mới để
-- không gây drift với schema.prisma.

-- Enum
ALTER TYPE "course_status" RENAME TO "space_status";

-- Bảng chính + cột self-FK
ALTER TABLE "courses" RENAME TO "spaces";
ALTER TABLE "spaces" RENAME COLUMN "cloned_from_course_id" TO "cloned_from_space_id";

-- Cột FK ở các bảng con
ALTER TABLE "chapters" RENAME COLUMN "course_id" TO "space_id";
ALTER TABLE "notes" RENAME COLUMN "course_id" TO "space_id";
ALTER TABLE "learning_progress" RENAME COLUMN "course_id" TO "space_id";

-- Constraint/index trên spaces
ALTER INDEX "courses_pkey" RENAME TO "spaces_pkey";
ALTER INDEX "courses_slug_key" RENAME TO "spaces_slug_key";
ALTER INDEX "courses_share_token_key" RENAME TO "spaces_share_token_key";
ALTER INDEX "courses_owner_id_cloned_from_course_id_key" RENAME TO "spaces_owner_id_cloned_from_space_id_key";
ALTER INDEX "courses_owner_id_idx" RENAME TO "spaces_owner_id_idx";
ALTER INDEX "courses_source_id_idx" RENAME TO "spaces_source_id_idx";
ALTER TABLE "spaces" RENAME CONSTRAINT "courses_owner_id_fkey" TO "spaces_owner_id_fkey";
ALTER TABLE "spaces" RENAME CONSTRAINT "courses_source_id_fkey" TO "spaces_source_id_fkey";
ALTER TABLE "spaces" RENAME CONSTRAINT "courses_cloned_from_course_id_fkey" TO "spaces_cloned_from_space_id_fkey";

-- Constraint/index ở bảng con
ALTER TABLE "chapters" RENAME CONSTRAINT "chapters_course_id_fkey" TO "chapters_space_id_fkey";
ALTER INDEX "chapters_course_id_idx" RENAME TO "chapters_space_id_idx";
ALTER TABLE "notes" RENAME CONSTRAINT "notes_course_id_fkey" TO "notes_space_id_fkey";
ALTER INDEX "notes_course_id_idx" RENAME TO "notes_space_id_idx";
ALTER TABLE "learning_progress" RENAME CONSTRAINT "learning_progress_course_id_fkey" TO "learning_progress_space_id_fkey";
ALTER INDEX "learning_progress_user_id_course_id_idx" RENAME TO "learning_progress_user_id_space_id_idx";
ALTER INDEX "learning_progress_course_id_idx" RENAME TO "learning_progress_space_id_idx";
