-- WP4.1 (Checkpoint 4) — bán gói credit để cắm vào nhánh UX #4 đã có sẵn từ
-- Checkpoint 3 (mục 4 economics doc): "Trả phí để nền tảng tạo giúp" khi user
-- không có BYOK và không có bản SHARED-BYOK trùng. Additive, không đổi bảng
-- cũ (nguyên tắc #1 ROADMAP.md).

-- Số dư credit hiện tại của user — nguồn sự thật nhanh để check trước khi
-- generate; chi tiết từng giao dịch nằm ở credit_transactions bên dưới.
ALTER TABLE "users" ADD COLUMN "credit_balance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" VARCHAR(255);
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- Ledger đầy đủ: mọi thay đổi credit_balance (mua/tiêu/hoàn) đều có 1 dòng ở
-- đây — cho phép audit lại số dư, và unique(stripe_reference) chống Stripe
-- gửi trùng webhook (retry) cộng credit 2 lần cho cùng 1 lần thanh toán.
CREATE TABLE "credit_transactions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" VARCHAR(30) NOT NULL,
    "stripe_reference" VARCHAR(255),
    "balance_after" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "credit_transactions_stripe_reference_key" ON "credit_transactions"("stripe_reference") WHERE "stripe_reference" IS NOT NULL;
CREATE INDEX "credit_transactions_user_id_created_at_idx" ON "credit_transactions"("user_id", "created_at");

ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
