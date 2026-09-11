#!/usr/bin/env sh
# A3 + C2 (docs/SURVIVAL.md): cảnh báo Telegram khi ổ/RAM/swap vượt ngưỡng,
# container không healthy, cert HTTPS sắp hết hạn, hoặc lượt AI hôm nay sắp
# chạm trần Groq. Chạy mỗi giờ qua cron — im lặng khi mọi thứ bình thường, chỉ
# gửi tin khi có vấn đề.
#
# Cần trước khi dùng:
#   1. Tạo bot: chat @BotFather trên Telegram → /newbot → lấy TELEGRAM_BOT_TOKEN.
#   2. Nhắn bot 1 câu bất kỳ, rồi mở
#      https://api.telegram.org/bot<TOKEN>/getUpdates → lấy "chat":{"id": ...}
#      → TELEGRAM_CHAT_ID.
#   3. Điền 2 biến đó + DOMAIN vào .env (đọc qua --env-file bên dưới).
#
# Chạy tay để test (hạ ngưỡng disk xuống 1 để ép cảnh báo):
#   DISK_THRESHOLD=1 /opt/elearning/scripts/ops/alert.sh
set -eu

ENV_FILE="${ENV_FILE:-/opt/elearning/.env}"
if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    set -a; . "$ENV_FILE"; set +a
fi

TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT="${TELEGRAM_CHAT_ID:-}"
HOST="$(hostname)"
DISK_THRESHOLD="${DISK_THRESHOLD:-85}"
SWAP_THRESHOLD="${SWAP_THRESHOLD:-70}"
CERT_DAYS_THRESHOLD="${CERT_DAYS_THRESHOLD:-10}"

send() {
    if [ -z "$TOKEN" ] || [ -z "$CHAT" ]; then
        echo "[alert.sh] thiếu TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID trong $ENV_FILE — bỏ qua gửi, in ra log: $1" >&2
        return 0
    fi
    curl -s -X POST "https://api.telegram.org/bot$TOKEN/sendMessage" \
        -d chat_id="$CHAT" -d text="[$HOST] $1" >/dev/null
}

# Ổ đĩa
DISK=$(df / | awk 'NR==2{gsub("%","",$5); print $5}')
[ "$DISK" -ge "$DISK_THRESHOLD" ] && send "⚠ Ổ đĩa ${DISK}% — chạy: docker system prune -af; xem /var/lib/docker"

# Swap
SWAP_USED=$(free -m | awk '/Swap/{print $3}')
SWAP_TOTAL=$(free -m | awk '/Swap/{print $2}')
if [ "$SWAP_TOTAL" -gt 0 ] && [ $((SWAP_USED * 100 / SWAP_TOTAL)) -ge "$SWAP_THRESHOLD" ]; then
    send "⚠ Swap ${SWAP_USED}MB/${SWAP_TOTAL}MB — RAM căng, cân nhắc docker restart elearning-app"
fi

# Container không healthy/running
for c in elearning-app elearning-db elearning-caddy; do
    S=$(docker inspect -f '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}}' "$c" 2>/dev/null || echo missing)
    case "$S" in
        running/healthy | running/-) ;;
        *) send "🔴 $c: $S" ;;
    esac
done

# Chứng chỉ HTTPS còn ít ngày (Caddy tự gia hạn, nhưng nếu DNS/port 80 hỏng thì không)
if [ -n "${DOMAIN:-}" ]; then
    EXP=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null \
        | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || true)
    if [ -n "$EXP" ]; then
        DAYS_LEFT=$(( ($(date -d "$EXP" +%s) - $(date +%s)) / 86400 ))
        [ "$DAYS_LEFT" -lt "$CERT_DAYS_THRESHOLD" ] && send "⚠ Cert $DOMAIN hết hạn sau ${DAYS_LEFT} ngày — docker logs elearning-caddy"
    fi
fi

# C2 — lượt gọi AI hôm nay đã dùng key nền tảng (không tính BYOK — đó là
# quota/tiền riêng của user). Báo sớm trước ngưỡng cảnh báo (mặc định 250,
# dưới trần cứng 300 của C1 AI_GLOBAL_DAILY_LIMIT) để còn kịp xử lý trước khi
# user thật bị chặn 429.
AI_ALERT_THRESHOLD="${AI_ALERT_DAILY_REQUESTS:-250}"
AI_TODAY=$(docker exec elearning-db psql -tA -U "${POSTGRES_USER:-elearning_user}" -d "${POSTGRES_DB:-elearning}" -c \
    "select count(*) from ai_generations where created_at >= date_trunc('day', now()) and key_source <> 'BYOK'" 2>/dev/null || true)
case "$AI_TODAY" in
    '' | *[!0-9]*) ;; # container/DB chưa sẵn sàng hoặc output lạ — bỏ qua, không báo sai
    *) [ "$AI_TODAY" -ge "$AI_ALERT_THRESHOLD" ] && send "⚠ AI hôm nay: $AI_TODAY lượt (ngưỡng cảnh báo $AI_ALERT_THRESHOLD, trần cứng ${AI_GLOBAL_DAILY_LIMIT:-300})" ;;
esac

# D4 (docs/SURVIVAL.md) — nhắc pull base image mới (postgres/caddy) + rebuild
# app nếu cả tháng không có commit nào. Chạy mỗi giờ nên chỉ gửi đúng 1 lần
# vào giờ 0 ngày 1 hằng tháng (khớp giờ cron chạy), không spam 24 lần/ngày đó.
if [ "$(date +%d)" = "01" ] && [ "$(date +%H)" = "00" ]; then
    send "🗓 Tháng mới: docker compose … pull db caddy && … up -d db caddy; nếu main không có commit tháng này thì rebuild app (git commit --allow-empty rồi deploy.sh)"
fi

exit 0
