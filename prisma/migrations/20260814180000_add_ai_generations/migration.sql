-- WP2.1 — AI generation data model (docs/design/ai-personalization-economics.md
-- mục 3). Additive only: new table `ai_generations` + nullable FK column on
-- `lessons`. Nothing existing is dropped or changed in meaning.

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "ai_generation_id" BIGINT;

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" BIGSERIAL NOT NULL,
    "source_id" BIGINT NOT NULL,
    "recipe_hash" VARCHAR(128) NOT NULL,
    "recipe_type" VARCHAR(20) NOT NULL,
    "is_default_recipe" BOOLEAN NOT NULL DEFAULT false,
    "key_source" VARCHAR(20) NOT NULL,
    "generated_by_user_id" BIGINT,
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "model_version" VARCHAR(50) NOT NULL,
    "content" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_generations_source_id_recipe_hash_idx" ON "ai_generations"("source_id", "recipe_hash");

-- CreateIndex
CREATE INDEX "ai_generations_generated_by_user_id_created_at_idx" ON "ai_generations"("generated_by_user_id", "created_at");

-- RÀNG BUỘC 1 (economics doc mục 3): unique(source_id, recipe_hash) chỉ khi
-- key_source = 'SHARED_FREE' — mỗi (Source, recipe mặc định) đúng 1 bản cache
-- dùng chung. Prisma schema syntax không biểu diễn được partial unique index,
-- nên khai báo thẳng ở đây; schema.prisma giữ @@index thường (non-unique) ở
-- trên làm tài liệu tham chiếu song song, ràng buộc thật nằm ở index này.
CREATE UNIQUE INDEX "ai_generations_shared_free_source_recipe_key"
    ON "ai_generations"("source_id", "recipe_hash")
    WHERE "key_source" = 'SHARED_FREE';

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_ai_generation_id_fkey" FOREIGN KEY ("ai_generation_id") REFERENCES "ai_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
