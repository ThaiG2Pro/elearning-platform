-- Mục "Tuyển chọn" trang chủ trước đây xếp theo id mới nhất, không kiểm soát
-- được thứ tự khi seed hàng chục playlist. Cột này cho seed (và sau này admin)
-- đặt thứ tự tường minh: nhỏ hơn lên trước, NULL đứng sau. Additive only:
-- 1 cột nullable, không đụng data hiện có.
ALTER TABLE "spaces" ADD COLUMN "showcase_order" INTEGER;
