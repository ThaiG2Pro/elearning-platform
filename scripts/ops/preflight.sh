#!/usr/bin/env bash
# Kiểm tra trước khi lên public. Chạy trên VPS sau khi điền .env:
#   scripts/ops/preflight.sh          (exit 1 nếu có FAIL)
set -uo pipefail
APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
ENV_FILE="$APP_DIR/.env"
FAIL=0; WARN=0
pass() { printf '  \033[32mPASS\033[0m %s\n' "$*"; }
warn() { printf '  \033[33mWARN\033[0m %s\n' "$*"; WARN=$((WARN+1)); }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }

[ -f "$ENV_FILE" ] || { fail ".env không tồn tại ($ENV_FILE)"; exit 1; }
set -a; . "$ENV_FILE"; set +a

echo "── .env"
[ -n "${DOMAIN:-}" ] && pass "DOMAIN=$DOMAIN" || fail "DOMAIN trống"
case "${FRONTEND_URL:-}" in
    https://"${DOMAIN:-__}"*) pass "FRONTEND_URL khớp https://DOMAIN" ;;
    *) fail "FRONTEND_URL phải là https://$DOMAIN (đang: '${FRONTEND_URL:-}') — dùng trong email kích hoạt + link share" ;;
esac
[ "${#JWT_SECRET}" -ge 32 ] && pass "JWT_SECRET ${#JWT_SECRET} ký tự" || fail "JWT_SECRET < 32 ký tự — app từ chối khởi động (openssl rand -base64 48)"
case "${POSTGRES_PASSWORD:-}" in
    ""|elearning_pass) fail "POSTGRES_PASSWORD trống hoặc mặc định dev" ;;
    *) [ "${#POSTGRES_PASSWORD}" -ge 16 ] && pass "POSTGRES_PASSWORD" || warn "POSTGRES_PASSWORD ngắn (<16)" ;;
esac
[ -n "${LITELLM_MASTER_KEY:-}" ] && pass "LITELLM_MASTER_KEY (API key provider) có" || fail "LITELLM_MASTER_KEY trống — tính năng AI miễn phí sẽ lỗi"
[ -n "${LITELLM_BASE_URL:-}" ] && pass "LITELLM_BASE_URL=$LITELLM_BASE_URL" || fail "LITELLM_BASE_URL trống"
case "${MAILTRAP_HOST:-}" in
    *mailtrap.io*|"") fail "MAILTRAP_HOST là sandbox/trống — email kích hoạt tài khoản sẽ KHÔNG tới user thật" ;;
    *) pass "SMTP host $MAILTRAP_HOST" ;;
esac
[ -n "${MAILTRAP_USER:-}" ] && [ -n "${MAILTRAP_PASS:-}" ] && pass "SMTP user/pass" || fail "SMTP user/pass trống"
case "${MAIL_FROM:-}" in
    *example.com*|*elearning.com*|"") warn "MAIL_FROM='${MAIL_FROM:-}' — domain phải verify ở nhà cung cấp SMTP, không thì vào spam/bị từ chối" ;;
    *) pass "MAIL_FROM=$MAIL_FROM" ;;
esac
[ -z "${STRIPE_SECRET_KEY:-}" ] && warn "Stripe tắt (bình thường nếu chưa bán credit)" || pass "Stripe bật"
[ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] && pass "Telegram alert cấu hình" || warn "TELEGRAM_BOT_TOKEN/CHAT_ID trống — scripts/ops/alert.sh sẽ chỉ ghi log, không báo động (xem docs/SURVIVAL.md A3)"
grep -q "NEXT_PUBLIC_" "$ENV_FILE" && warn "NEXT_PUBLIC_* trong .env không có tác dụng ở runtime (nướng lúc build CI)"

echo "── Hệ thống"
if command -v docker >/dev/null; then
    pass "docker $(docker --version | cut -d' ' -f3 | tr -d ,)"
    docker compose version >/dev/null 2>&1 && pass "docker compose" || fail "docker compose plugin thiếu"
else fail "docker chưa cài (chạy vps-setup.sh)"; fi
swapon --show | grep -q . && pass "swap $(swapon --show --noheadings | awk '{print $3}' | head -1)" || warn "không có swap"
MEM=$(awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo)
[ "$MEM" -ge 1800 ] && pass "RAM ${MEM}MB" || warn "RAM ${MEM}MB — dưới 2GB, theo dõi OOM"
DISK=$(df -BG / | awk 'NR==2{gsub("G","",$4); print $4}')
[ "$DISK" -ge 5 ] && pass "ổ trống ${DISK}GB" || fail "ổ trống ${DISK}GB — dưới 5GB, prune image/log"
command -v ufw >/dev/null && ufw status | grep -q "Status: active" && pass "ufw bật" || warn "ufw chưa bật"
for p in 80 443; do
    if ss -ltn "sport = :$p" | grep -q LISTEN && ! docker ps --format '{{.Names}}' | grep -q elearning-caddy; then
        fail "cổng $p đang bị process khác chiếm (nginx/apache?)"
    else pass "cổng $p"; fi
done

echo "── Mạng / DNS"
MYIP=$(curl -4 -fsS --max-time 5 https://api.ipify.org || echo "?")
DNSIP=$(getent ahostsv4 "${DOMAIN:-localhost}" 2>/dev/null | awk '{print $1; exit}')
if [ -n "$DNSIP" ] && [ "$DNSIP" = "$MYIP" ]; then pass "DNS $DOMAIN → $DNSIP (= IP máy)";
elif [ -n "$DNSIP" ]; then fail "DNS $DOMAIN → $DNSIP nhưng IP máy là $MYIP (Cloudflare proxy cam? tắt proxy tới khi Caddy lấy cert xong)";
else fail "DNS $DOMAIN chưa trỏ về đâu"; fi

echo "── Image / backup"
IMG="${APP_IMAGE:-ghcr.io/thaig2pro/elearning-platform:latest}"
if docker manifest inspect "$IMG" >/dev/null 2>&1; then pass "pull được $IMG";
else fail "không pull được $IMG — package private? docker login ghcr.io (PAT read:packages), hoặc CI chưa push"; fi
if command -v rclone >/dev/null && rclone listremotes 2>/dev/null | grep -q "^${RCLONE_REMOTE:-r2}:"; then
    rclone lsd "${RCLONE_REMOTE:-r2}:${BUCKET:-elearning-backup}" >/dev/null 2>&1 && pass "rclone → R2 bucket OK" || fail "rclone remote có nhưng bucket ${BUCKET:-elearning-backup} không truy cập được"
else warn "rclone chưa cấu hình remote 'r2' — backup sẽ không chạy"; fi

echo
printf 'Kết quả: %d FAIL, %d WARN\n' "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ] || exit 1
