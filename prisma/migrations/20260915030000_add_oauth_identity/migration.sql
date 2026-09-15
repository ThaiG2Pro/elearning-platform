-- 2026-09-15 — đăng nhập Google/GitHub (OAuth). password_hash của users vẫn
-- NOT NULL cho tài khoản OAuth (sinh ngẫu nhiên ở UserFactory.createFromOAuth,
-- không ai biết, không dùng để login password) để không phải đổi cột đó sang
-- nullable và sửa lại UserEntity/UserRepository. oauth_provider/oauth_subject
-- nullable vì user đăng ký bằng password không có provider.
CREATE TYPE "user_oauth_provider" AS ENUM ('GOOGLE', 'GITHUB');

ALTER TABLE "users" ADD COLUMN     "oauth_provider" "user_oauth_provider",
ADD COLUMN     "oauth_subject" VARCHAR(255);

-- Postgres cho phép nhiều NULL trùng nhau qua unique index, nên constraint
-- này chỉ thực sự ràng buộc các user đã liên kết OAuth.
CREATE UNIQUE INDEX "users_oauth_provider_oauth_subject_key" ON "users"("oauth_provider", "oauth_subject");
