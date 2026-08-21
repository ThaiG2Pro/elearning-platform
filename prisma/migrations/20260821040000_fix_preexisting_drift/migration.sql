-- Drift có sẵn từ trước (phát hiện khi verify schema hardening 2026-08-21):
-- 1. Các cột timestamp lệch precision so với schema (timestamp(6) vs (3)).
-- 2. credit_transactions.stripe_reference được enforce bằng PARTIAL unique
--    index (WHERE stripe_reference IS NOT NULL) — về mặt uniqueness tương
--    đương @unique của Prisma (Postgres vốn cho nhiều NULL qua unique index
--    thường), nhưng Prisma không nhận dạng partial index nên migrate diff
--    báo drift vĩnh viễn. Thay bằng unique index thường.

ALTER TABLE "ai_generations" ALTER COLUMN "archived_at" SET DATA TYPE TIMESTAMP(3);

ALTER TABLE "credit_transactions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

ALTER TABLE "sources" ALTER COLUMN "last_accessed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "archived_at" SET DATA TYPE TIMESTAMP(3);

DROP INDEX IF EXISTS "credit_transactions_stripe_reference_key";
CREATE UNIQUE INDEX "credit_transactions_stripe_reference_key" ON "credit_transactions"("stripe_reference");
