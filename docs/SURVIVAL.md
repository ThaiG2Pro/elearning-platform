# Sinh tồn sau khi lên public — VPS 1 vCPU / 2GB / 16GB, 1 người vận hành

Tài liệu này liệt kê **những gì còn thiếu** sau `LAUNCH_CHECKLIST.md`, để app sống được khi
bị cào bot, bào quota AI, dò SSH, hoặc đơn giản là hết RAM lúc 3 giờ sáng mà không ai biết.
Mỗi mục có: vì sao, làm thế nào (lệnh/code), và cách biết đã xong. Làm theo thứ tự ưu tiên,
mỗi mục độc lập, bỏ qua được mục nào nếu chưa cần.

Đã có sẵn trong repo (không cần làm lại): rate limit auth/AI/upload theo IP và user, timeout
LLM 60s, `mem_limit` từng container, log rotation, swap, ufw, fail2ban, unattended-upgrades,
healthcheck `/api/health`, backup R2 có so hash, SSRF guard cho URL người dùng dán.

Ký hiệu: 🟥 làm trong tuần đầu · 🟧 tuần 2–3 · 🟩 khi rảnh

---

## A. Chết mà không biết

### A1. 🟥 Uptime monitor (0 code, 3 phút)

**Vì sao.** Không có gì báo khi app sập. User bỏ đi trước khi bạn biết.

**Làm.**
1. Đăng ký [uptimerobot.com](https://uptimerobot.com) (free 50 monitor, 5 phút/lần) hoặc
   [betterstack.com](https://betterstack.com/uptime) (free 10 monitor, 3 phút/lần).
2. Thêm monitor loại HTTP(s): URL `https://<DOMAIN>/api/health`, keyword `ok` (để bắt cả
   trường hợp trả 200 nhưng DB chết → body là `db_unreachable`).
3. Alert contact: email + Telegram (UptimeRobot có bot Telegram sẵn).

**Xong khi.** Tắt app thử `docker stop elearning-app`, trong 5 phút có thông báo; bật lại
`docker start elearning-app`.

### A2. ✅ 2026-09-11 🟥 Tự hồi sinh container treo — autoheal

**Vì sao.** `restart: unless-stopped` chỉ khởi động lại khi process **chết**. Node treo
(event loop kẹt, hết heap nhưng chưa crash) → Docker đánh `unhealthy` rồi… để đó.

**Đã có trong repo.** Service `autoheal` đã ở `deploy/docker-compose.prod.yml`, lên cùng
`docker compose … up -d` lần deploy tới, không cần làm gì thêm.

Lưu ý: mount `docker.sock` cho container này quyền điều khiển Docker — chấp nhận vì image
nhỏ, phổ biến, chỉ đọc trạng thái và gọi restart. Không mount sock cho container nào khác.

**Xong khi.** `docker exec elearning-app kill -STOP 1` (đóng băng process) → sau ~90s
`docker ps` thấy app restart, `docker logs elearning-autoheal` có dòng restart.

### A3. ✅ 2026-09-11 (code xong, cần điền token) 🟧 Cảnh báo RAM / ổ đĩa qua Telegram

**Vì sao.** Ổ 16GB đầy → Postgres ngừng ghi → mọi thao tác lỗi im lặng. Swap đầy → máy
chậm như chết. Cả hai đều xảy ra từ từ, có thể báo trước.

**Đã có trong repo.** `scripts/ops/alert.sh` (tự đọc `/opt/elearning/.env`) và cron
`0 * * * * root … alert.sh` đã nằm trong `/etc/cron.d/elearning` do `vps-setup.sh` tạo. Chỉ
còn 2 việc thủ công:
1. Tạo bot Telegram: chat với `@BotFather` → `/newbot` → lấy `BOT_TOKEN`. Chat với bot 1 câu,
   rồi mở `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` lấy `chat.id`.
2. Điền `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` vào `.env` trên VPS (mẫu trong
   `deploy/.env.production.example`). `preflight.sh` sẽ WARN nếu quên.

**Xong khi.** Chạy tay với ngưỡng hạ thấp tạm (`DISK_THRESHOLD=1 scripts/ops/alert.sh`) →
nhận tin Telegram.

### A4. 🟩 Xem log tập trung khi cần điều tra

Không cần cài gì thêm ở quy mô này. Ghi nhớ 4 lệnh:

```sh
docker logs -f --tail 200 elearning-app          # lỗi app
docker logs --since 1h elearning-caddy            # request/cert
docker exec elearning-caddy tail -n 200 /data/access.log | grep -v '"status":200'
docker exec elearning-db psql -U $POSTGRES_USER -d $POSTGRES_DB -c \
  "select pid, now()-query_start as dur, left(query,80) from pg_stat_activity where state='active' order by dur desc;"
```

---

## B. Chết vì tài nguyên

### B1. ✅ 2026-09-11 🟥 Restart app định kỳ (1 dòng cron)

**Vì sao.** Node + jsdom chạy nhiều ngày trên máy nhỏ hay phình RAM dần. Restart 10 giây
lúc vắng người rẻ hơn mọi cuộc săn leak.

**Đã có trong repo.** Dòng cron `15 4 * * 0 root docker restart elearning-app …` đã ở
`/etc/cron.d/elearning` do `vps-setup.sh` tạo, chạy cùng đợt cron A3/backup/prune.
(4h15 sáng chủ nhật; đổi giờ trong `vps-setup.sh` nếu access.log cho thấy giờ khác vắng hơn.)

**Xong khi.** Thứ hai kiểm `docker ps` cột STATUS thấy "Up 1 day" thay vì "Up 8 days".

### B2. ✅ 2026-09-11 🟥 `robots.txt` chặn bot cào

**Vì sao.** Crawler AI (GPTBot, ClaudeBot, Bytespider, Amazonbot…) cào hàng nghìn trang/giờ,
mỗi trang học là 1 lần render + query. Với 1 vCPU, chúng là "user" đông nhất của bạn.

**Đã có trong repo.** `src/app/robots.ts` (Next.js tự sinh `/robots.txt`) chặn bot AI, cho
bot tìm kiếm cào trang public. Chưa có `src/app/sitemap.ts` nên robots.txt tạm không khai
`Sitemap:` — hợp lệ, chỉ thiếu tối ưu SEO, thêm sau khi cần.

Bot xấu không đọc robots.txt → đã chặn thêm ở Caddy (`deploy/Caddyfile`, khối domain,
trước `reverse_proxy`):

```caddyfile
	@badbots header_regexp User-Agent (?i)(Bytespider|PetalBot|SemrushBot|AhrefsBot|MJ12bot|DotBot|python-requests|Go-http-client|curl/)
	respond @badbots 403
```

(`curl/` chặn luôn `curl` — nếu bạn hay test bằng curl thì bỏ mục đó, hoặc thêm `-A Mozilla`.)

**Xong khi.** `curl -A Bytespider -I https://<DOMAIN>/` → 403; `curl -A Mozilla -I …` → 200.

### B3. 🟧 Cloudflare proxy (mây cam) — CDN, chống DDoS, giấu IP

**Vì sao.** Đứng trước VPS, chặn phần lớn traffic rác trước khi tới máy 1 vCPU; cache
`/_next/static/*` và ảnh; IP thật của VPS không lộ → không bị đánh thẳng.

**Điều kiện.** Đã lên public ổn, Caddy đã có cert (A3 không đỏ).

**Làm.**
1. cloudflare.com → Add site → chọn Free → Cloudflare đưa 2 nameserver → vào tech.com đổi
   nameserver của domain sang 2 địa chỉ đó (24h lan truyền, thường 1–2h).
2. Trong Cloudflare DNS: A record trỏ IP VPS, đám mây **cam** (Proxied).
3. SSL/TLS → mode **Full (strict)** (Cloudflare ↔ Caddy vẫn HTTPS bằng cert Let's Encrypt).
4. Security → Bots → bật **Bot Fight Mode**. Security → Settings → Security level: Medium.
5. Caching → Cache Rules → thêm rule: URI path starts with `/_next/static/` → Eligible for cache, Edge TTL 1 tháng.
6. Rate limiting (free có 1 rule): path `/api/v1/auth/*` → 30 req / 10s / IP → Block 10 phút.
   Đây là lớp thứ hai ngoài rate limit trong app (app reset khi restart, Cloudflare thì không).
7. Caddy giờ nhận IP của Cloudflare trong `remote_ip` — `X-Forwarded-For` đã có IP thật ở
   đầu chuỗi, `getClientIp` trong app lấy đúng. Không cần đổi code.

**Xong khi.** `dig +short <DOMAIN>` trả IP của Cloudflare (104.x/172.x), không phải IP VPS;
trang vẫn mở; `docker logs elearning-caddy` không có lỗi TLS.

**Rủi ro.** Nếu sau này Caddy cần gia hạn cert mà HTTP-01 challenge bị Cloudflare chặn:
chuyển Caddy sang dùng **Cloudflare Origin Certificate** (15 năm, miễn phí) — tạo ở
SSL/TLS → Origin Server, lưu vào `deploy/certs/`, Caddyfile đổi thành
`tls /etc/caddy/certs/origin.pem /etc/caddy/certs/origin.key`. Chỉ làm khi gặp.

### B4. ✅ 2026-09-11 🟧 Giới hạn kích thước request ở Caddy

**Vì sao.** App đã cap upload quiz và avatar, nhưng cap ở tầng app nghĩa là body vẫn phải
đọc vào RAM trước khi từ chối. Chặn sớm ở Caddy rẻ hơn.

**Đã có trong repo.** `request_body { max_size 8MB }` đã ở khối domain của `deploy/Caddyfile`.
(8MB vì ảnh avatar gốc trước resize cho phép tới 8MB ở client — client resize xong chỉ gửi
< 120KB, nhưng để dư an toàn.)

**Xong khi.** `head -c 20000000 /dev/zero | curl -X POST --data-binary @- https://<DOMAIN>/api/v1/auth/avatar -o /dev/null -w '%{http_code}'` → 413.

### B5. 🟩 Postgres: kiểm tra định kỳ

Autovacuum mặc định đủ dùng. Mỗi tháng chạy 1 lần để biết DB lớn tới đâu và index nào vô dụng:

```sh
docker exec elearning-db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "
select pg_size_pretty(pg_database_size(current_database())) as db_size;" -c "
select relname, pg_size_pretty(pg_total_relation_size(relid)) from pg_catalog.pg_statio_user_tables order by pg_total_relation_size(relid) desc limit 8;"
```

Cột `sources.transcript` sẽ là thứ phình nhanh nhất (60K chữ/nguồn). Khi > 1GB, chạy
`scripts/archiveStaleData.ts` (từ máy dev, DATABASE_URL qua SSH tunnel) để null hoá
transcript của nguồn không ai dùng 180 ngày.

---

## C. Chết vì tiền / quota

### C1. ✅ 2026-09-11 🟥 Trần AI toàn hệ thống mỗi ngày (cần code, ~30 phút)

**Vì sao.** Đã có trần **mỗi user** 20 lần/ngày (`AI_DAILY_ACTIVATION_LIMIT`) và 6 lần/phút.
Chưa có trần **toàn app**: 100 tài khoản rác × 20 = 2.000 lần gọi Groq/ngày → hết quota
free tier, user thật mất AI, hoặc nếu có thẻ thì tốn tiền.

**Đã có trong repo.**
- `AI_GLOBAL_DAILY_LIMIT=300` trong `.env.example` + `deploy/.env.production.example`.
- `AIGenerationRepository.countActivationsTodayGlobal()` — đếm `ai_generations` hôm nay,
  chỉ `key_source` SHARED_FREE/PAID_TIER (không tính BYOK).
- `AIGenerationPolicy.enforceGlobalDailyLimit()` + `AIGenerationService.generate` gọi nó
  ngay sau check per-user, trước khi đọc transcript hay trừ credit.
- Route `sources/[sourceId]/ai-generations/route.ts` map `AI_GLOBAL_LIMIT_REACHED` → 429.
- `src/lib/aiGeneration.ts` dịch message tiếng Việt; `AILessonComposer.tsx` tự mở panel
  BYOK khi gặp code này (BYOK không tính vào trần chung, vẫn dùng được ngay).
- Test: `AIGenerationService.test.ts`, `AIGenerationPolicy.test.ts`.

**Xong khi.** Đặt `AI_GLOBAL_DAILY_LIMIT=1` trên local, gọi AI 2 lần → lần 2 báo 429.

### C2. ✅ 2026-09-11 🟧 Theo dõi quota Groq và cảnh báo

**Vì sao.** Groq free tier có giới hạn request/ngày và token/phút theo model; đổi không báo
trước (đã từng gỡ model, xem comment trong `litellm/config.yaml`).

**Đã có trong repo.** `scripts/ops/alert.sh` (A3, chạy cron hàng giờ) đã có thêm bước đếm
`ai_generations` hôm nay (loại BYOK) và báo Telegram khi ≥ `AI_ALERT_DAILY_REQUESTS` (mặc
định 250, dưới trần cứng 300 của C1). Vẫn nên tự làm thủ công:
- Bookmark https://console.groq.com/settings/limits, xem mỗi tuần đầu.
- `scripts/aiUsageReport.ts` (chạy tay từ máy dev) cho báo cáo chi tiết hơn khi cần.

### C3. 🟩 Đăng ký hàng loạt

Đã có: 5 đăng ký/IP/giờ, phải kích hoạt qua email, tài khoản INACTIVE tự xoá sau 24h.
Bot đổi IP vẫn qua được nhưng phải có hộp mail thật cho từng tài khoản → tốn kém cho kẻ tấn công.
**Chỉ làm thêm khi thấy** > 50 user mới/ngày mà không có traffic tương ứng:
- Cloudflare Turnstile (CAPTCHA không cần bấm, free) ở form đăng ký — cần 1 component
  client + verify token ở `api/v1/auth/register` (POST tới `challenges.cloudflare.com/turnstile/v0/siteverify`).
- Hoặc chặn domain email tạm (10minutemail…) bằng danh sách
  [disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) trong `RegistrationPolicy`.

Theo dõi bằng: `select date(created_at), count(*) from users group by 1 order by 1 desc limit 14;`

### C4. 🟩 Email: không để bị đánh dấu spam

- Verify đủ SPF/DKIM/DMARC ở Mailtrap Sending (3 dòng DNS đều xanh).
- Không gửi mail marketing từ cùng domain giai đoạn này.
- Mailtrap free 1.000 mail/tháng: kích hoạt + quên mật khẩu ≈ 2 mail/user → ~500 user mới/tháng.
  Vượt thì đổi sang Brevo (300/ngày) — chỉ đổi 4 biến `MAILTRAP_*`, không đổi code.

---

## D. Chết vì bị hack

### D1. 🟥 SSH: chỉ dùng key, tắt mật khẩu, tắt root login

**Vì sao.** VPS Việt Nam bị dò mật khẩu SSH liên tục từ phút đầu. fail2ban chỉ làm chậm.

**Làm — THEO ĐÚNG THỨ TỰ, sai thứ tự là tự khoá mình ngoài cửa.**
1. Trên máy bạn (WSL): `ssh-keygen -t ed25519 -C "elearning-vps"` (Enter hết) → có
   `~/.ssh/id_ed25519.pub`.
2. Đẩy key lên VPS: `ssh-copy-id root@<IP>` (nhập mật khẩu lần cuối).
3. **Mở terminal thứ hai**, `ssh root@<IP>` — phải vào được **không hỏi mật khẩu**. Nếu hỏi, dừng, kiểm lại bước 2.
4. Tạo user thường có sudo (để không dùng root hằng ngày):
   ```sh
   adduser --disabled-password --gecos "" deploy
   usermod -aG sudo,docker deploy
   mkdir -p /home/deploy/.ssh && cp /root/.ssh/authorized_keys /home/deploy/.ssh/ && chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
   echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/deploy
   ```
   Terminal thứ hai: `ssh deploy@<IP>` phải vào được, `sudo -i` không hỏi mật khẩu.
5. Khoá cửa (vẫn giữ terminal đang mở):
   ```sh
   cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
   PasswordAuthentication no
   KbdInteractiveAuthentication no
   PermitRootLogin no
   MaxAuthTries 3
   EOF
   sshd -t && systemctl restart ssh
   ```
6. Terminal thứ ba: `ssh deploy@<IP>` vào được → xong. `ssh root@<IP>` phải bị từ chối.
7. Từ giờ: `ssh deploy@<IP>`, lệnh docker chạy trực tiếp (đã trong group docker), việc cần root dùng `sudo`.

**Xong khi.** `ssh -o PubkeyAuthentication=no deploy@<IP>` → "Permission denied (publickey)".

**Backup key.** Chép `~/.ssh/id_ed25519` (file private) vào Bitwarden/1Password dạng
attachment. Mất key = mất quyền vào VPS (nhà cung cấp thường có console cứu hộ, nhưng phiền).

### D2. 🟥 Lưu `.env` production ở nơi thứ hai

**Vì sao.** `.env` trên VPS là bản duy nhất chứa `POSTGRES_PASSWORD` và `JWT_SECRET`. Mất
nó → backup DB có cũng khó khôi phục, mọi user bị logout. (Bản `.env` local đã bị xoá nhầm
1 lần trong quá trình chuẩn bị deploy — chuyện này xảy ra thật.)

**Làm.** Ngay sau khi điền `.env` xong: `cat /opt/elearning/.env` → dán vào một Secure Note
trong Bitwarden (free) / 1Password, tên "elearning VPS .env <ngày>". Mỗi lần đổi giá trị,
cập nhật note. **Không** commit vào git, **không** gửi qua chat.

### D3. ✅ 2026-09-11 🟧 Chỉ cho container app ra ngoài những gì cần

**Vì sao.** Nếu app bị khai thác (RCE qua thư viện nào đó), kẻ tấn công dùng VPS làm bàn đạp.
Postgres và Caddy không cần ra internet; app chỉ cần tới Groq, YouTube, SMTP, và URL user dán.

**Đã có trong repo.** `deploy/docker-compose.prod.yml`: `db` chỉ ở network `internal`
(`internal: true` — không có đường ra internet); `app` và `migrate` ở cả `internal` +
`egress`; `caddy` chỉ ở `egress` (không cần thấy db). `autoheal` dùng `network_mode: "none"`
— chỉ nói chuyện qua `docker.sock` đã mount, không cần network nào. Đã validate bằng
`docker compose config`.

**Xong khi.** `docker exec elearning-db wget -qO- --timeout=3 https://example.com` → thất bại;
app vẫn tạo được space từ link YouTube.

### D4. ✅ 2026-09-11 (nhắc tự động) 🟧 Cập nhật image định kỳ

**Vì sao.** `postgres:16-alpine`, `caddy:2-alpine`, `node:24-alpine` (base của app) có CVE
mới hàng tháng. CI đã có `pnpm audit`; base image thì chưa ai kéo mới.

**Đã có trong repo.** `scripts/ops/alert.sh` (A3, cron hàng giờ) gửi Telegram đúng 1 lần vào
00:00 ngày 1 hằng tháng, nhắc pull image + kiểm tra có cần rebuild app không. Vẫn cần tự làm
tay khi nhận được nhắc:
- App: mỗi lần push `main` CI build lại từ `node:24-alpine` mới nhất → chỉ cần deploy đều.
  Nếu 1 tháng không có commit, tạo 1 commit rỗng `git commit --allow-empty -m "chore: rebuild image"` rồi `deploy.sh`.
- Postgres/Caddy: `docker compose -f deploy/docker-compose.prod.yml --env-file .env pull db caddy && … up -d db caddy`
  (Postgres chỉ nhận **minor** trong cùng major 16 — không tự nhảy 17, vì data format khác).

### D5. 🟩 Cloudflare Access cho các route quản trị (khi có admin)

Hiện không có trang admin. Khi làm, đừng viết auth riêng — đặt sau Cloudflare Access (free
50 user): chỉ email của bạn qua được `/admin/*`, bot không thấy cả trang đăng nhập.

### D6. ✅ 2026-09-11 🟩 Rà soát header bảo mật

Đã có CSP, HSTS, X-Frame-Options trong `next.config.js`. Đã thêm
`Cross-Origin-Opener-Policy: same-origin` (không có luồng OAuth popup nào trong app — đã
grep `window.open`/popup để xác nhận trước khi thêm). Sau khi lên, chạy
https://securityheaders.com và https://observatory.mozilla.org với domain thật — mục tiêu A.

---

## E. Chết vì con người (bạn)

### E1. 🟥 Lịch gia hạn

Domain (tech.com) và VPS hết hạn là cái chết chắc chắn nhất trong tài liệu này, và không
script nào cứu được. Đặt 2 sự kiện trên lịch điện thoại, **trước 14 ngày**, lặp hằng năm
(domain) / hằng tháng hoặc năm (VPS tuỳ gói). Bật auto-renew nếu nhà cung cấp cho.

### E2. 🟥 Diễn tập khôi phục 1 lần

Backup chưa từng restore thì chưa phải backup. Tuần đầu sau khi lên:

```sh
# 1. backup thật
FORCE=1 scripts/ops/backup-db.sh
# 2. Postgres tạm, cổng khác, không đụng DB thật
docker run -d --name pg-drill -e POSTGRES_PASSWORD=x -e POSTGRES_DB=drill postgres:16-alpine
sleep 5
# 3. restore vào đó
rclone cat r2:elearning-backup/$(rclone lsf r2:elearning-backup | sort | tail -1) \
  | docker exec -i pg-drill pg_restore -U postgres -d drill --no-owner
# 4. kiểm
docker exec pg-drill psql -U postgres -d drill -c "select count(*) from users;"
# 5. dọn
docker rm -f pg-drill
```
Số user khớp với DB thật → backup dùng được. Ghi ngày diễn tập vào đây: ______

### E3. 🟧 Sổ tay sự cố (runbook 1 trang)

Khi có chuyện lúc 2h sáng, không ai nhớ gì. In hoặc ghim đoạn này:

| Triệu chứng | Lệnh đầu tiên | Thường là |
|---|---|---|
| Trang không mở, monitor đỏ | `docker ps -a` | container exit → `docker logs --tail 100 <tên>` |
| Trang mở nhưng lỗi 500 | `docker logs --tail 200 elearning-app` | DB không kết nối / hết connection pool |
| Chậm toàn tập | `free -m; docker stats --no-stream` | swap đầy → `docker restart elearning-app` |
| Không nhận mail | `docker logs elearning-app 2>&1 \| grep -i mail` | SMTP pass hết hạn / DNS DKIM đỏ |
| AI lỗi | `curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" $LITELLM_BASE_URL/models` | key hết hạn / model bị gỡ → đổi `AI_DEFAULT_MODEL` |
| Ổ đầy | `df -h /; docker system df` | `docker system prune -af`; `journalctl --vacuum-size=100M` |
| Cert lỗi | `docker logs elearning-caddy \| grep -i acme` | DNS đổi / cổng 80 bị chặn / Cloudflare cam khi renew |
| Bị tấn công (traffic bất thường) | `docker exec elearning-caddy tail -n 2000 /data/access.log \| jq -r '.request.remote_ip' \| sort \| uniq -c \| sort -rn \| head` | bật Cloudflare "Under Attack Mode"; `ufw deny from <IP>` |
| Rollback bản vừa deploy | `APP_IMAGE=ghcr.io/thaig2pro/elearning-platform:sha-<7> FORCE=1 scripts/ops/deploy.sh` | tag sha xem ở GitHub → Packages |
| Mất sạch VPS | thuê VPS mới → `vps-setup.sh` → dán `.env` từ Bitwarden → `deploy.sh` → `restore-db.sh` → đổi A record | 30–60 phút nếu E2 đã làm |

### E4. 🟩 Giới hạn thời gian của chính bạn

Đặt 1 khung 30 phút mỗi tuần (ví dụ sáng thứ hai) làm 5 việc, không hơn:
1. Mở UptimeRobot xem uptime tuần.
2. `docker stats --no-stream; df -h /` — ghi 3 số vào 1 ghi chú để thấy xu hướng.
3. `select date(created_at), count(*) from users …` — có gì bất thường?
4. Xem tab Actions GitHub xanh không; `pnpm audit` có gì mới không.
5. Xem console Groq còn quota không.

Ngoài khung đó, chỉ động vào khi monitor báo. Sinh tồn dài hạn là không cháy sức.

---

## Thứ tự gợi ý

| Tuần | Làm |
|---|---|
| Trước khi lên | A1 uptime · D2 lưu .env · E1 lịch gia hạn |
| Tuần 1 | A2 autoheal · B1 cron restart · B2 robots + chặn bot · D1 SSH key · C1 trần AI toàn hệ thống · E2 diễn tập restore |
| Tuần 2–3 | A3 alert Telegram · B3 Cloudflare · B4 body limit · C2 quota Groq · D3 network · D4 lịch cập nhật image |
| Khi rảnh | A4 · B5 · C3 · C4 · D5 · D6 · E3 in runbook · E4 |

Mỗi mục làm xong đánh ✅ vào đầu dòng và ghi ngày, để lần sau mở file biết mình đang ở đâu.
