-- 2026-09-15 — nâng luồng credit lên chuẩn vận hành (audit "đạt chuẩn ngành chưa"):
--
-- 1. REFUND cho 1 lượt AI chỉ được tồn tại ĐÚNG 1 dòng — DB từ chối bản thứ 2
--    kể cả khi app có bug (trước đây chỉ app kiểm tra trong transaction).
CREATE UNIQUE INDEX "credit_transactions_refund_per_generation_key"
    ON "credit_transactions"("ai_generation_id")
    WHERE "reason" = 'REFUND' AND "ai_generation_id" IS NOT NULL;

-- 2. Stripe hoàn tiền / chargeback: cần nối ngược từ charge (payment_intent)
--    về dòng PURCHASE để thu hồi đúng số credit đã cộng. Checkout Session id
--    (stripe_reference) không xuất hiện trong event charge.* nên lưu thêm
--    payment_intent lúc checkout.session.completed.
ALTER TABLE "credit_transactions" ADD COLUMN "stripe_payment_intent" VARCHAR(255);
CREATE INDEX "credit_transactions_stripe_payment_intent_idx"
    ON "credit_transactions"("stripe_payment_intent");

-- 3. Lý do mới cho tiền RA khỏi tài khoản do Stripe:
--    STRIPE_REFUND_CLAWBACK — Stripe hoàn tiền (một phần/toàn bộ) → thu hồi
--      credit tương ứng, số dư CÓ THỂ ÂM nếu đã tiêu (là nợ, chặn tiêu tiếp).
--    DISPUTE_CLAWBACK — khách chargeback: Stripe rút tiền ngay khi mở tranh
--      chấp → thu hồi toàn bộ credit gói.
--    DISPUTE_WON_RESTORE — thắng tranh chấp, tiền về → trả lại credit.
ALTER TYPE "credit_reason" ADD VALUE 'STRIPE_REFUND_CLAWBACK';
ALTER TYPE "credit_reason" ADD VALUE 'DISPUTE_CLAWBACK';
ALTER TYPE "credit_reason" ADD VALUE 'DISPUTE_WON_RESTORE';
