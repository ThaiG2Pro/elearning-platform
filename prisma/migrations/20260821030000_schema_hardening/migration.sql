-- Schema hardening (2026-08-21):
--  1. Enum hoá mọi cột status/type VarChar tự do (đặc biệt key_source/visibility
--     quyết định tiền & quyền riêng tư).
--  2. Tách avatar (blob data-URL) khỏi bảng users nóng → user_avatars.
--  3. Bỏ bảng roles + users.role_id → users.role enum (3 role tĩnh, không có
--     permission matrix, join mỗi lần auth không mua được gì).
--  4. questions: option_a..d (4 cột cứng, pad '') → options jsonb array.
--  5. learning_progress: drop personal_note legacy (bảng notes thay thế),
--     siết NOT NULL user_id/course_id (nullable làm unique key vô hiệu).
--  6. courses.cloned_from_course_id: thêm self-FK SetNull (hết dangling id).
--  7. sources.metadata: Text chứa JSON-string → jsonb.
--  8. tokens: index user_id (FK không được Prisma tự index).
--  9. courses/lessons: thêm updated_at.

-- ── 0. Dọn drift/leftovers từ giai đoạn 12/2025 ──────────────────────────────
-- Một số DB dev còn sót cột users.role (enum "UserRole" CamelCase) + các type
-- "UserRole"/"UserStatus"/"CourseStatus" mà migration 20251230074225 đáng lẽ
-- đã drop. Cột role sót này KHÔNG được code maintain (role_id mới là nguồn
-- đúng) nên drop thẳng, không migrate giá trị từ nó.
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
DROP TYPE IF EXISTS "UserRole";
DROP TYPE IF EXISTS "UserStatus";
DROP TYPE IF EXISTS "CourseStatus";

-- ── 1. Enum types ───────────────────────────────────────────────────────────
CREATE TYPE "user_role" AS ENUM ('STUDENT', 'LECTURER', 'ADMIN');
CREATE TYPE "user_status" AS ENUM ('INACTIVE', 'ACTIVE', 'DELETED');
CREATE TYPE "token_type" AS ENUM ('ACTIVATION', 'RECOVERY');
CREATE TYPE "source_type" AS ENUM ('YOUTUBE_VIDEO', 'WEB_ARTICLE');
CREATE TYPE "course_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "lesson_type" AS ENUM ('VIDEO', 'QUIZ', 'ARTICLE');
CREATE TYPE "ai_recipe_type" AS ENUM ('summary', 'quiz');
CREATE TYPE "ai_key_source" AS ENUM ('SHARED_FREE', 'BYOK', 'PAID_TIER');
CREATE TYPE "ai_visibility" AS ENUM ('PRIVATE', 'SHARED');
CREATE TYPE "ai_status" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TYPE "credit_reason" AS ENUM ('PURCHASE', 'AI_GENERATION_SPEND', 'REFUND');

-- ── 2. users: role enum + status enum + tách avatar ─────────────────────────
-- 'PENDING' (seed cũ) đồng nghĩa 'INACTIVE' (code) — thống nhất về INACTIVE.
UPDATE "users" SET "status" = 'INACTIVE' WHERE "status" = 'PENDING';

ALTER TABLE "users" ADD COLUMN "role" "user_role";
UPDATE "users" u SET "role" = r."name"::"user_role" FROM "roles" r WHERE u."role_id" = r."id";
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL,
                    ALTER COLUMN "role" SET DEFAULT 'STUDENT';
ALTER TABLE "users" ALTER COLUMN "status" TYPE "user_status" USING "status"::"user_status";

CREATE TABLE "user_avatars" (
    "user_id" BIGINT NOT NULL,
    "data" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_avatars_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "user_avatars" ("user_id", "data")
    SELECT "id", "avatar_url" FROM "users" WHERE "avatar_url" IS NOT NULL;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_id_fkey";
ALTER TABLE "users" DROP COLUMN "role_id", DROP COLUMN "avatar_url";
DROP TABLE "roles";

-- ── 3. tokens ────────────────────────────────────────────────────────────────
ALTER TABLE "tokens" ALTER COLUMN "type" TYPE "token_type" USING "type"::"token_type";
CREATE INDEX "tokens_user_id_idx" ON "tokens"("user_id");

-- ── 4. sources ───────────────────────────────────────────────────────────────
ALTER TABLE "sources" ALTER COLUMN "type" TYPE "source_type" USING "type"::"source_type";
ALTER TABLE "sources" ALTER COLUMN "metadata" TYPE JSONB
    USING CASE WHEN "metadata" IS NULL THEN NULL ELSE "metadata"::jsonb END;

-- ── 5. courses ───────────────────────────────────────────────────────────────
UPDATE "courses" SET "status" = 'ACTIVE' WHERE lower("status") = 'active';
ALTER TABLE "courses" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "courses" ALTER COLUMN "status" TYPE "course_status" USING "status"::"course_status";
ALTER TABLE "courses" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "courses" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Dọn id dangling (course gốc đã xoá) trước khi thêm FK.
UPDATE "courses" c SET "cloned_from_course_id" = NULL
    WHERE c."cloned_from_course_id" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "courses" o WHERE o."id" = c."cloned_from_course_id");
ALTER TABLE "courses" ADD CONSTRAINT "courses_cloned_from_course_id_fkey"
    FOREIGN KEY ("cloned_from_course_id") REFERENCES "courses"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 6. lessons ───────────────────────────────────────────────────────────────
ALTER TABLE "lessons" ALTER COLUMN "type" TYPE "lesson_type" USING "type"::"lesson_type";
ALTER TABLE "lessons" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ── 7. questions: option_a..d → options jsonb ────────────────────────────────
ALTER TABLE "questions" ADD COLUMN "options" JSONB;
UPDATE "questions" q SET "options" = COALESCE(
    (SELECT jsonb_agg(o) FROM unnest(ARRAY[q."option_a", q."option_b", q."option_c", q."option_d"]) AS o
     WHERE btrim(o) <> ''),
    '[]'::jsonb
);
ALTER TABLE "questions" ALTER COLUMN "options" SET NOT NULL;
ALTER TABLE "questions" DROP COLUMN "option_a", DROP COLUMN "option_b",
                        DROP COLUMN "option_c", DROP COLUMN "option_d";

-- ── 8. learning_progress ─────────────────────────────────────────────────────
-- Phòng hờ: row mồ côi (nếu có) không thể quy về user/course nào — xoá trước
-- khi siết NOT NULL. DB hiện tại đã xác nhận 0 row như vậy.
DELETE FROM "learning_progress" WHERE "user_id" IS NULL OR "course_id" IS NULL;
ALTER TABLE "learning_progress" ALTER COLUMN "user_id" SET NOT NULL,
                                ALTER COLUMN "course_id" SET NOT NULL,
                                DROP COLUMN "personal_note";

-- ── 9. ai_generations ────────────────────────────────────────────────────────
-- Partial unique index có predicate trên key_source — drop trước khi đổi type
-- cột rồi tạo lại với literal enum.
DROP INDEX "ai_generations_shared_free_source_recipe_key";
ALTER TABLE "ai_generations"
    ALTER COLUMN "recipe_type" TYPE "ai_recipe_type" USING "recipe_type"::"ai_recipe_type",
    ALTER COLUMN "key_source" TYPE "ai_key_source" USING "key_source"::"ai_key_source",
    ALTER COLUMN "visibility" DROP DEFAULT,
    ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ai_generations"
    ALTER COLUMN "visibility" TYPE "ai_visibility" USING "visibility"::"ai_visibility",
    ALTER COLUMN "status" TYPE "ai_status" USING "status"::"ai_status";
ALTER TABLE "ai_generations"
    ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE',
    ALTER COLUMN "status" SET DEFAULT 'PENDING';
CREATE UNIQUE INDEX "ai_generations_shared_free_source_recipe_key"
    ON "ai_generations"("source_id", "recipe_hash")
    WHERE "key_source" = 'SHARED_FREE';

-- ── 10. credit_transactions ──────────────────────────────────────────────────
ALTER TABLE "credit_transactions"
    ALTER COLUMN "reason" TYPE "credit_reason" USING "reason"::"credit_reason";
