-- WP4.2 (Checkpoint 4) — policy dọn dữ liệu (mục 6.4 economics doc): archive
-- Source/AIGeneration không truy cập lâu ngày và không còn course công khai
-- nào tham chiếu. Additive, không đổi ý nghĩa cột cũ (nguyên tắc #1).

-- Cột theo dõi "lần cuối thật sự được dùng" (khác created_at/updated_at —
-- những cột đó phản ánh lần tạo/sửa, không phải lần đọc). Cập nhật mỗi khi
-- AIGenerationService.generate() chạm tới Source này (cache hit hay miss).
ALTER TABLE "sources" ADD COLUMN "last_accessed_at" TIMESTAMP(6);
ALTER TABLE "sources" ADD COLUMN "archived_at" TIMESTAMP(6);

-- Archive không xoá row (giữ để cache-key/audit vẫn nhất quán) — chỉ đánh
-- dấu archived_at và null hoá field nặng nhất (content/transcript) ở tầng
-- application (scripts/archiveStaleData.ts), không phải ở migration này.
ALTER TABLE "ai_generations" ADD COLUMN "archived_at" TIMESTAMP(6);
