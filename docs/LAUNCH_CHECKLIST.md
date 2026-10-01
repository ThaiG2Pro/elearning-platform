# Checklist lên public — VPS VN 1C/2GB/16GB (2026-09-09)

Thứ tự làm. Mỗi bước có lệnh; `preflight.sh` phải toàn PASS trước bước 6.

## 0. Trên GitHub (1 lần)
- [ ] Settings → Actions → Variables: `NEXT_PUBLIC_DONATE_URL` (nếu muốn nút donate; nướng vào bundle lúc build).
- [ ] Packages → `elearning-platform` → Package settings → **Change visibility → Public**
      (hoặc giữ private và `docker login ghcr.io` trên VPS bằng PAT scope `read:packages`).
- [ ] Push lên `main` xong, tab Actions xanh cả 2 job `Quality Gate` và `Build & push image`.

## 1. Dịch vụ ngoài (miễn phí)
- [ ] **Groq API key** → `LITELLM_MASTER_KEY`.
- [ ] **YouTube Data API v3 key** (Google Cloud Console, miễn phí) → `YOUTUBE_API_KEY`. Chỉ seed
      playlist cần; app chạy bình thường không có.
- [ ] **SMTP thật** (Brevo 300 mail/ngày hoặc Resend 100/ngày): verify domain gửi, lấy user/pass →
      `MAILTRAP_HOST/PORT/USER/PASS`, `MAIL_FROM=noreply@<domain>`. Mailtrap sandbox KHÔNG gửi tới user thật →
      không ai kích hoạt được tài khoản.
- [ ] **Cloudflare R2**: tạo bucket `elearning-backup`, API token S3 (Object Read & Write).
- [ ] **Stripe** (chỉ khi bật mua credit): lấy `STRIPE_SECRET_KEY` (live). Developers → Webhooks →
      Add endpoint `https://DOMAIN/api/v1/billing/webhook`, chọn ĐỦ 4 event: `checkout.session.completed`,
      `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed` → lấy `STRIPE_WEBHOOK_SECRET`.
      Thiếu 3 event sau = khách hoàn tiền/chargeback mà credit vẫn còn trong tài khoản.
- [ ] **Cảnh báo về tiền**: tạo incoming webhook Discord/Slack → `OPS_ALERT_WEBHOOK_URL`. Nhận: đối soát
      credit thấy nợ, sổ cái lệch, Stripe hoàn tiền / chargeback.
- [ ] **OAuth Google/GitHub** (2026-09-15, tuỳ chọn — trống thì nút vẫn hiện nhưng bấm vào báo lỗi, không
      chặn phần còn lại của app):
      - Google Cloud Console → Credentials → OAuth client ID (Web application). Authorized redirect URI:
        `https://DOMAIN/api/v1/auth/oauth/google/callback` → `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
      - GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Authorization callback URL:
        `https://DOMAIN/api/v1/auth/oauth/github/callback` → `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`.
- [ ] **DNS**: A record `DOMAIN` → IP VPS. Nếu dùng Cloudflare, để **DNS only** (mây xám) cho tới khi Caddy
      lấy cert xong; bật proxy cam sau nếu muốn CDN/cache.

## 2. VPS
```sh
ssh root@<ip>
curl -fsSL https://raw.githubusercontent.com/ThaiG2Pro/elearning-platform/main/scripts/ops/vps-setup.sh | bash
```
Script cài Docker, swap 1GB, ufw 22/80/443, fail2ban, log rotation, rclone, clone repo vào `/opt/elearning`,
cron backup + prune.

## 3. Cấu hình
```sh
cd /opt/elearning
nano .env                 # mẫu deploy/.env.production.example — sinh secret:
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 24   # POSTGRES_PASSWORD
openssl rand -hex 32      # INTERNAL_CRON_SECRET (endpoint đối soát credit)
rclone config             # remote tên "r2", type S3, provider Cloudflare
docker login ghcr.io      # chỉ khi package private
```

## 4. Preflight
```sh
scripts/ops/preflight.sh
```
Sửa cho tới `0 FAIL`. WARN đọc rồi quyết.

## 5. Deploy lần đầu
```sh
scripts/ops/deploy.sh
```
Pull image → db → migrate → app + caddy → chờ healthy → gọi `https://DOMAIN/api/health`.
Cert Let's Encrypt mất ~30s lần đầu (`docker logs -f elearning-caddy`).

Nạp nội dung khởi điểm (additive, chạy lại không tạo trùng — KHÔNG phải `prisma db seed`, cái đó
TRUNCATE). Container `app` là image standalone không có pnpm/ts-node nên chạy qua service `migrate`
(build từ stage `builder`, có đủ node_modules) như migration:
```sh
. /opt/elearning/.env
docker compose run --rm -e YOUTUBE_API_KEY="$YOUTUBE_API_KEY" migrate pnpm seed:playlists   # 58 space Tuyển chọn, ~5 phút
docker compose run --rm migrate pnpm seed:active-users                                      # user ảo + clone để Phổ biến/Mới nổi không trống
```

Sau khi app healthy, đặt cron đối soát credit (mỗi 15 phút — hoàn bù lượt AI trả phí bị cắt giữa chừng,
kiểm tra sổ cái, bắn cảnh báo nếu có gì bất thường; bình thường job này KHÔNG tìm thấy gì):
```sh
echo '*/15 * * * * root . /opt/elearning/.env && curl -fsS -X POST -H "Authorization: Bearer $INTERNAL_CRON_SECRET" https://DOMAIN/api/internal/credits/reconcile >> /var/log/elearning-credits.log 2>&1' | sudo tee /etc/cron.d/elearning-credits
```

## 6. Smoke test tay (5 phút)
- [ ] Trang chủ tải, ảnh thumbnail hiện.
- [ ] Đăng ký → **nhận được email** kích hoạt → kích hoạt → đăng nhập.
- [ ] Nếu đã điền `GOOGLE_CLIENT_ID`/`GITHUB_CLIENT_ID`: bấm nút "Google"/"GitHub" ở `/login` → về đúng
      redirect URI đã khai báo ở dịch vụ (không phải `localhost`) → đăng nhập thành công.
- [ ] Dán 1 link YouTube tạo space → học → tiến độ lưu (reload còn).
- [ ] Trong space vừa tạo bấm "AI tạo quiz 10 câu" (nhánh miễn phí Groq) → có quiz. (AI tóm tắt và
      nguồn web/blog đã ẩn từ 2026-09-15 — dán link ngoài YouTube phải báo "Hiện chỉ hỗ trợ link
      YouTube", không phải lỗi 500.)
- [ ] Trang chủ mục "Tuyển chọn" có space, bấm "Xem tất cả N" → `/spaces/tuyen-chon` hiện đủ N space
      (cần đã chạy `pnpm seed:playlists` ở mục 5; mục "Phổ biến"/"Mới nổi" chỉ hiện sau
      `pnpm seed:active-users` hoặc khi có user thật sao chép space).
- [ ] Tạo link share → mở ẩn danh được.
- [ ] Nếu bật Stripe: mua gói $1 bằng thẻ test `4242 4242 4242 4242` (Stripe test mode trước, live sau)
      → về `/billing?checkout=success` → số dư +10 → lịch sử có dòng "Mua gói". Hoàn tiền từ Stripe
      Dashboard → sau vài giây số dư trừ 10, có dòng "Stripe hoàn tiền", có cảnh báo ở Discord/Slack.
- [ ] `curl -X POST -H "Authorization: Bearer $INTERNAL_CRON_SECRET" "https://DOMAIN/api/internal/credits/reconcile?dryRun=1"`
      → JSON 3 mảng rỗng.
- [ ] `FORCE=1 scripts/ops/backup-db.sh` → file xuất hiện trên R2.
- [ ] `docker stats --no-stream` — app < 500MB, db < 150MB.

## 7. Vận hành
| Việc | Lệnh |
|---|---|
| Cập nhật bản mới | `scripts/ops/deploy.sh` (chạy sau khi CI push image) |
| Rollback | `APP_IMAGE=ghcr.io/thaig2pro/elearning-platform:sha-<7 ký tự> FORCE=1 scripts/ops/deploy.sh` |
| Log app | `docker logs -f --tail 200 elearning-app` |
| RAM/CPU | `docker stats --no-stream`; `free -m` |
| Khôi phục DB | `scripts/ops/restore-db.sh [file]` |
| Ổ đĩa | `df -h /; docker system df` |
| Đối soát credit tay | `curl -X POST -H "Authorization: Bearer $INTERNAL_CRON_SECRET" https://DOMAIN/api/internal/credits/reconcile` (thêm `?dryRun=1` để chỉ xem) |
| Sửa credit tay (có dấu vết) | từ máy dev, tunnel DB: `pnpm credits:adjust -- --user <id> --amount <±n> --note "<lý do>"` |

## Sau khi lên: đọc [SURVIVAL.md](SURVIVAL.md)
Monitor, autoheal, chặn bot, trần AI toàn hệ thống, SSH key, Cloudflare, diễn tập restore, runbook sự cố — xếp theo tuần.

## Chưa làm / biết trước
- `scripts/archiveStaleData.ts`, `aiUsageReport.ts`, `reconcileCredits.ts`, `creditAdjust.ts` chạy bằng ts-node,
  không có trong image runner — chạy từ máy dev với `DATABASE_URL` trỏ VPS (qua SSH tunnel) khi cần.
  Riêng đối soát credit đã có bản chạy trong container (`/api/internal/credits/reconcile`) cho cron.
- Gói mua TRƯỚC migration `20260915010000` không có `stripe_payment_intent` → hoàn tiền/chargeback cho gói
  đó không tự thu hồi được, hệ thống chỉ cảnh báo; xử lý bằng `credits:adjust`. Không ảnh hưởng nếu bật
  Stripe sau khi đã deploy bản này.
- Hoá đơn/thuế: Stripe Checkout tự gửi receipt nếu bật trong Dashboard (Settings → Emails). Chưa xuất hoá
  đơn VAT VN.
- Rate limiter in-memory reset khi restart container — chấp nhận ở 1 instance.
- Chưa có uptime monitor: đăng ký free UptimeRobot/BetterStack ping `https://DOMAIN/api/health` mỗi 5 phút.
