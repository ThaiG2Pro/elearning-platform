# Checklist lên public — VPS VN 1C/2GB/16GB (2026-09-09)

Thứ tự làm. Mỗi bước có lệnh; `preflight.sh` phải toàn PASS trước bước 6.

## 0. Trên GitHub (1 lần)
- [ ] Settings → Actions → Variables: `NEXT_PUBLIC_DONATE_URL` (nếu muốn nút donate; nướng vào bundle lúc build).
- [ ] Packages → `elearning-platform` → Package settings → **Change visibility → Public**
      (hoặc giữ private và `docker login ghcr.io` trên VPS bằng PAT scope `read:packages`).
- [ ] Push lên `main` xong, tab Actions xanh cả 2 job `Quality Gate` và `Build & push image`.

## 1. Dịch vụ ngoài (miễn phí)
- [ ] **Groq API key** → `LITELLM_MASTER_KEY`.
- [ ] **SMTP thật** (Brevo 300 mail/ngày hoặc Resend 100/ngày): verify domain gửi, lấy user/pass →
      `MAILTRAP_HOST/PORT/USER/PASS`, `MAIL_FROM=noreply@<domain>`. Mailtrap sandbox KHÔNG gửi tới user thật →
      không ai kích hoạt được tài khoản.
- [ ] **Cloudflare R2**: tạo bucket `elearning-backup`, API token S3 (Object Read & Write).
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

## 6. Smoke test tay (5 phút)
- [ ] Trang chủ tải, ảnh thumbnail hiện.
- [ ] Đăng ký → **nhận được email** kích hoạt → kích hoạt → đăng nhập.
- [ ] Dán 1 link YouTube tạo space → học → tiến độ lưu (reload còn).
- [ ] Dán 1 link bài viết web → tạo space → bấm AI tóm tắt (nhánh miễn phí Groq) → có kết quả.
- [ ] Tạo link share → mở ẩn danh được.
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

## Sau khi lên: đọc [SURVIVAL.md](SURVIVAL.md)
Monitor, autoheal, chặn bot, trần AI toàn hệ thống, SSH key, Cloudflare, diễn tập restore, runbook sự cố — xếp theo tuần.

## Chưa làm / biết trước
- `scripts/archiveStaleData.ts` và `aiUsageReport.ts` chạy bằng ts-node, không có trong image runner —
  chạy từ máy dev với `DATABASE_URL` trỏ VPS (qua SSH tunnel) khi cần.
- Rate limiter in-memory reset khi restart container — chấp nhận ở 1 instance.
- Chưa có uptime monitor: đăng ký free UptimeRobot/BetterStack ping `https://DOMAIN/api/health` mỗi 5 phút.
