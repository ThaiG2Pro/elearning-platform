-- 2026-09-15 — đối soát credit (audit luồng trừ/hoàn credit):
--
-- 1. credit_transactions.ai_generation_id: nối mỗi dòng SPEND/REFUND với đúng
--    row ai_generations mà nó trả tiền cho. Không có cột này thì khi process
--    chết giữa chừng (function serverless bị cắt, DB lỗi lúc hoàn) không có
--    cách nào xác định chắc chắn lượt nào đã trừ mà chưa hoàn để bù lại.
ALTER TABLE "credit_transactions" ADD COLUMN "ai_generation_id" BIGINT;
CREATE INDEX "credit_transactions_ai_generation_id_idx" ON "credit_transactions"("ai_generation_id");

-- 2. Chống bấm đúp / 2 tab cho nhánh PAID_TIER: findInFlight + create là 2
--    bước rời, 2 request cách nhau vài chục ms cùng đi qua. Partial unique
--    index để DB chỉ cho đúng 1 row PENDING/(source, recipe, user) — request
--    thứ 2 đụng P2002 → AI_GENERATION_IN_PROGRESS, chưa trừ gì (create chạy
--    trước spendCredits theo thứ tự mới ở AIGenerationService).
CREATE UNIQUE INDEX "ai_generations_paid_pending_key"
    ON "ai_generations"("source_id", "recipe_hash", "generated_by_user_id")
    WHERE "key_source" = 'PAID_TIER' AND "status" = 'PENDING';
