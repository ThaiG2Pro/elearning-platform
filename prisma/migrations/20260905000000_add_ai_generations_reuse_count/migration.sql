-- Trang quản lý "/my-ai-shares" cho người share BYOK cần biết bản của họ đã
-- được ai dùng lại (cache hit) bao nhiêu lần — schema hiện chưa có cột nào
-- track việc này (chỉ đếm được số lesson đang gắn ai_generation_id, không
-- phải lịch sử tái dùng thật). Additive only: 1 cột mới, default 0, không
-- đụng data hiện có.
ALTER TABLE "ai_generations" ADD COLUMN "reuse_count" INTEGER NOT NULL DEFAULT 0;
