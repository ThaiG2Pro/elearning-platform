-- WP1.10.1 — "course này sinh từ nguồn nào" (1 video lẻ hay playlist),
-- neo ở tầng course (khớp mô hình "1 URL → 1 không gian học"). Nullable:
-- course tạo trống (không qua from-link) không có nguồn.
ALTER TABLE "courses" ADD COLUMN "source_id" BIGINT;

ALTER TABLE "courses" ADD CONSTRAINT "courses_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "courses_source_id_idx" ON "courses"("source_id");
