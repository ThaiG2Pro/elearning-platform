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
   **Không bao giờ chạy `prisma db seed` trên prod.** `prisma/seed.ts` là dữ
   liệu dev/QA: nó `TRUNCATE` toàn bộ bảng rồi tạo 4 user với mật khẩu
   `password123`. Script tự từ chối chạy khi `NODE_ENV=production` hoặc
   `DATABASE_URL` không trỏ về DB local; chỉ vượt qua bằng
   `ALLOW_DESTRUCTIVE_SEED=1` khi thật sự muốn xoá sạch dữ liệu.
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

## VPS tự host / hosting rẻ (bổ sung 2026-09-06)

Các cấu hình đã có sẵn trong repo cho máy 512MB–1GB RAM, 1 vCPU:

- **Không build trên VPS.** `next build` cần ~1.5–2GB RAM. CI (`ci.yml`, job
  `docker-image`) tự build và push `ghcr.io/<owner>/<repo>:latest` mỗi lần
  push lên `main`. Trên VPS chỉ `docker pull` rồi `docker run`/compose với
  image đó (đổi `build:` của service `app` thành `image:`).
- **Node heap** đã giới hạn `NODE_OPTIONS=--max-old-space-size=384` trong
  Dockerfile. Máy ≥2GB có thể override qua env.
- **Postgres pool:** `DATABASE_URL` phải có `connection_limit=5&pool_timeout=10`
  (xem `.env.example`). Nếu Postgres chạy cùng máy: `shared_buffers=64MB`,
  `max_connections=20`. Bật swap 1–2GB trên VPS.
- **Reverse proxy có cache** (Caddy/Nginx/Cloudflare) phía trước: hai endpoint
  public `GET /api/v1/spaces` và `GET /api/v1/spaces/share/[token]` đã trả
  `Cache-Control: s-maxage=60` để proxy cache được. Proxy cũng phải truyền
  `X-Forwarded-For` để rate limit theo IP hoạt động.
- **Timeout LLM:** `AI_LLM_TIMEOUT_MS` (mặc định 60000). Transcript YouTube
  timeout cứng 20s.
- **LiteLLM proxy** (~300–500MB RAM) là service nặng nhất trong compose — cân
  nhắc host riêng hoặc gọi thẳng provider; quyết định kiến trúc, chưa chốt.
