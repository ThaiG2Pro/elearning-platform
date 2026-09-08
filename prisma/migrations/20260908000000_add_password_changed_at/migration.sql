-- Security fix: session/refresh-token không bị huỷ khi đổi hoặc reset mật
-- khẩu. Thêm mốc thời gian đổi mật khẩu gần nhất để /auth/refresh có thể
-- từ chối refresh token phát hành trước mốc này. Additive only, nullable,
-- không đụng data hiện có — user chưa từng đổi mật khẩu có giá trị NULL
-- (coi như "chưa từng đổi", refresh token nào cũng còn hợp lệ).
ALTER TABLE "users" ADD COLUMN "password_changed_at" TIMESTAMP(6);
