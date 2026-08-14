-- WP2.2 — transcript lưu duy nhất ở Source (economics doc mục 6.5), lazy-
-- fetched khi user bấm dùng AI lần đầu. Additive, nullable.

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "transcript" TEXT,
ADD COLUMN     "transcript_fetched_at" TIMESTAMP(3);
