# Deploy / hosting (WP1.8)

## Quyết định (wayfinder ticket 05/09)

$0 tuyệt đối chỉ đúng ở giai đoạn founder-only. Ngay khi Checkpoint 1 mở cho
người ngoài, chuyển sang một host ổn định, founder tự gánh phí, **vô thời
hạn** — không gate trên retention. **[Xác nhận 2026-08-12]** Host hiện tại
đang chạy thật là **Vercel free tier** (không phải Oracle Always Free như
giả định gốc của ticket) — nhưng lý do migrate vẫn giữ nguyên: free tier bất
kỳ nhà cung cấp nào đều có rủi ro nền tảng (giới hạn bandwidth/function,
chính sách có thể siết lại) mà một dự án mở cho người ngoài không nên phụ
thuộc vào. **Chưa cần migrate ngay** — Checkpoint 1 chưa mở cho người ngoài
tại thời điểm này; đây là việc làm đúng lúc gate (mở Checkpoint 1), không
phải nợ kỹ thuật cần trả ngay.

Repo đã có `Dockerfile` production-ready (multi-stage, standalone Next.js
output, non-root user) — không cần viết lại gì để deploy, chỉ cần chọn nơi
chạy nó.

## Lựa chọn: Fly.io (~$5–7/tháng cho scale hiện tại)

Lý do: build trực tiếp từ `Dockerfile` có sẵn, có region Singapore (gần VN),
free egress đủ cho quy mô "cộng đồng hẹp" ở Checkpoint 1–2. `fly.toml` ở gốc
repo đã cấu hình sẵn.

Các bước — **thao tác tài khoản/thanh toán này cần người vận hành làm, không
tự động hoá được**:

1. Tạo tài khoản Fly.io + gắn thẻ thanh toán: https://fly.io
2. `brew install flyctl` (hoặc xem hướng dẫn cài cho OS khác), rồi `fly auth login`
3. Provision Postgres riêng (đừng chạy `db` service của `docker-compose.yml`
   ở production — đó chỉ là setup local):
   ```
   fly postgres create --name elearning-platform-db --region sin
   ```
4. Từ gốc repo: `fly launch --no-deploy` — nó sẽ nhận `fly.toml` có sẵn, xác
   nhận app name. Sau đó `fly postgres attach elearning-platform-db` để bơm
   `DATABASE_URL` vào secrets tự động.
5. Set các secret còn lại (không commit giá trị thật vào repo):
   ```
   fly secrets set JWT_SECRET="..." FRONTEND_URL="https://elearning-platform.fly.dev" \
     YOUTUBE_API_KEY="..." MAILTRAP_HOST="..." MAILTRAP_PORT=2525 \
     MAILTRAP_USER="..." MAILTRAP_PASS="..." MAIL_FROM="..." \
     NEXT_PUBLIC_DONATE_URL="https://ko-fi.com/yourhandle"
   ```
6. Chạy migration một lần (không có trong Dockerfile runtime image theo thiết
   kế — xem `migrate` profile trong `docker-compose.yml` để tham khảo lệnh):
   ```
   fly ssh console -C "pnpm exec prisma migrate deploy"
   ```
7. `fly deploy`
8. Trỏ DNS domain thật (nếu có) về Fly qua `fly certs add <domain>`.

## Donate button (WP1.8, phần đã xong trong code)

Nút "Ủng hộ" ở header đọc từ `NEXT_PUBLIC_DONATE_URL` (xem `.env.example`) —
set secret này ở bước 5 trên để nút hiện ra. Không set thì nút tự ẩn, không
trỏ tới link giả. Khung chữ trung tính theo Vision mục 7 — không có logic
subscription/gate feature nào phụ thuộc vào nó.

## Trạng thái

- [x] Docker image production-ready sẵn có (trước WP1.8)
- [x] `fly.toml` — config deploy sẵn cho Fly.io
- [x] Donate button trong code, bật qua env, tắt an toàn khi chưa cấu hình
- [ ] **Tài khoản Fly.io thật + thanh toán + deploy thật** — việc vận hành,
      cần người có quyền thanh toán của dự án làm, ngoài phạm vi agent code.
