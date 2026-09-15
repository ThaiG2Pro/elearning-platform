-- 2026-09-15 — điều chỉnh tay có dấu vết: khi job đối soát báo "cần xử lý
-- tay" (refund không khớp gói, sổ cái lệch…), người vận hành sửa số dư qua
-- scripts/creditAdjust.ts → luôn đi qua ledger với lý do MANUAL_ADJUSTMENT
-- và ghi chú vì sao. Không bao giờ UPDATE users.credit_balance trực tiếp.
ALTER TYPE "credit_reason" ADD VALUE 'MANUAL_ADJUSTMENT';
ALTER TABLE "credit_transactions" ADD COLUMN "note" VARCHAR(500);
