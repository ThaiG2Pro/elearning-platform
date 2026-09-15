# Runbook sự cố — elearning-platform

1 trang, để in hoặc ghim (E3, `docs/SURVIVAL.md`). Khi có chuyện lúc 2h sáng, không ai nhớ
gì — mở file này (hoặc bản giấy) trước, đừng cố nhớ lại lệnh.

| Triệu chứng | Lệnh đầu tiên | Thường là |
|---|---|---|
| Trang không mở, monitor đỏ | `docker ps -a` | container exit → `docker logs --tail 100 <tên>` |
| Trang mở nhưng lỗi 500 | `docker logs --tail 200 elearning-app` | DB không kết nối / hết connection pool |
| Chậm toàn tập | `free -m; docker stats --no-stream` | swap đầy → `docker restart elearning-app` |
| Không nhận mail | `docker logs elearning-app 2>&1 \| grep -i mail` | SMTP pass hết hạn / DNS DKIM đỏ |
| AI lỗi | `curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" $LITELLM_BASE_URL/models` | key hết hạn / model bị gỡ → đổi `AI_DEFAULT_MODEL` |
| AI báo hết lượt cho mọi user | `docker exec elearning-db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "select count(*) from ai_generations where created_at >= date_trunc('day', now()) and key_source <> 'BYOK';"` | chạm `AI_GLOBAL_DAILY_LIMIT` (C1) — đợi 0h hoặc nâng tạm biến này rồi `docker restart elearning-app` |
| Ổ đầy | `df -h /; docker system df` | `docker system prune -af`; `journalctl --vacuum-size=100M` |
| Cert lỗi | `docker logs elearning-caddy \| grep -i acme` | DNS đổi / cổng 80 bị chặn / Cloudflare cam khi renew |
| Bị tấn công (traffic bất thường) | `docker exec elearning-caddy tail -n 2000 /data/access.log \| jq -r '.request.remote_ip' \| sort \| uniq -c \| sort -rn \| head` | bật Cloudflare "Under Attack Mode"; `ufw deny from <IP>` |
| Rollback bản vừa deploy | `APP_IMAGE=ghcr.io/thaig2pro/elearning-platform:sha-<7> FORCE=1 scripts/ops/deploy.sh` | tag sha xem ở GitHub → Packages |
| Cảnh báo "Đối soát credit có phát hiện" | `curl -X POST -H "Authorization: Bearer $INTERNAL_CRON_SECRET" "https://DOMAIN/api/internal/credits/reconcile?dryRun=1"` | `refunded` > 0: đã tự hoàn bù, chỉ cần biết. `balanceMismatches` > 0: có đường ghi số dư không qua ledger → tìm ai UPDATE tay/seed; sửa bằng `pnpm credits:adjust`, KHÔNG sửa SQL |
| Cảnh báo "Stripe refund/dispute không khớp gói nào" | Stripe Dashboard → Payments → tìm payment_intent trong cảnh báo → xem email khách → `docker exec elearning-db psql … -c "select id,email,credit_balance from users where email='…'"` | gói mua trước khi có `stripe_payment_intent` → thu hồi tay: `pnpm credits:adjust -- --user <id> --amount -<credit gói> --note "refund re_… tay"` |
| Khách báo "mất credit"/"bị trừ mà không có kết quả" | `docker exec elearning-db psql … -c "select id,amount,reason,ai_generation_id,balance_after,created_at from credit_transactions where user_id=<id> order by id desc limit 20;"` | SPEND không có REFUND cùng `ai_generation_id` mà row ai_generations FAILED/PENDING → chạy đối soát (không dryRun) là hoàn; nếu vẫn không → `credits:adjust` |
| Webhook Stripe đỏ liên tục trong Dashboard | `docker logs elearning-app 2>&1 \| grep -i "stripe webhook"` | sai `STRIPE_WEBHOOK_SECRET` (đổi endpoint là đổi secret) hoặc chưa bật đủ 4 event |
| Mất sạch VPS | thuê VPS mới → `vps-setup.sh` → dán `.env` từ Bitwarden → `deploy.sh` → `restore-db.sh` → đổi A record | 30–60 phút nếu E2 đã diễn tập |

## Lệnh xem log tập trung (A4)

```sh
docker logs -f --tail 200 elearning-app          # lỗi app
docker logs --since 1h elearning-caddy            # request/cert
docker exec elearning-caddy tail -n 200 /data/access.log | grep -v '"status":200'
docker exec elearning-db psql -U $POSTGRES_USER -d $POSTGRES_DB -c \
  "select pid, now()-query_start as dur, left(query,80) from pg_stat_activity where state='active' order by dur desc;"
```

## Container/network trong hệ thống (D3)

`elearning-app` cần cả `internal` (nói chuyện với `elearning-db`) và `egress` (Groq/YouTube/
SMTP/URL người dùng dán). `elearning-db` chỉ `internal` — không có đường ra internet kể cả
khi bị chiếm. `elearning-caddy` chỉ `egress`. `elearning-autoheal` không có network nào
(`network_mode: none`, chỉ dùng `docker.sock`). Nếu 1 container không gọi được container
khác như mong đợi, kiểm tra đúng 2 network này trước khi nghi ngờ DNS/firewall.
