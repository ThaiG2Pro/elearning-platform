#!/usr/bin/env bash
# Deploy/cập nhật production trên VPS:
#   scripts/ops/deploy.sh            # pull image :latest → backup → migrate → restart app → health
#   APP_IMAGE=ghcr.io/...:sha-abc123 scripts/ops/deploy.sh   # ghim bản cụ thể (rollback)
set -euo pipefail
APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$APP_DIR"
COMPOSE=(docker compose -f deploy/docker-compose.prod.yml --env-file .env)
set -a; . ./.env; set +a
export APP_IMAGE="${APP_IMAGE:-ghcr.io/thaig2pro/elearning-platform:latest}"

log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }

log "Cập nhật repo (compose/Caddyfile/prisma migrations/scripts)"
git pull -q --ff-only || echo "  (git pull thất bại — dùng bản đang có)"

log "Pull $APP_IMAGE"
docker pull -q "$APP_IMAGE"
NEW_ID=$(docker image inspect -f '{{.Id}}' "$APP_IMAGE")
CUR_ID=$(docker inspect -f '{{.Image}}' elearning-app 2>/dev/null || echo none)
if [ "$NEW_ID" = "$CUR_ID" ] && [ "${FORCE:-0}" != "1" ]; then
    echo "  image không đổi, app đang chạy bản này rồi. FORCE=1 để deploy lại."; exit 0
fi

log "Khởi động db (nếu chưa)"
"${COMPOSE[@]}" up -d db
"${COMPOSE[@]}" exec -T db sh -c 'until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null; do sleep 1; done'

if docker ps --format '{{.Names}}' | grep -q '^elearning-app$'; then
    log "Backup trước khi migrate (FORCE)"
    FORCE=1 "$APP_DIR/scripts/ops/backup-db.sh" || echo "  ⚠ backup thất bại (rclone chưa cấu hình?) — tiếp tục"
fi

log "prisma migrate deploy"
"${COMPOSE[@]}" run --rm migrate

log "Khởi động app + caddy"
"${COMPOSE[@]}" up -d --remove-orphans app caddy

log "Chờ health"
for i in $(seq 1 30); do
    if [ "$(docker inspect -f '{{.State.Health.Status}}' elearning-app 2>/dev/null)" = "healthy" ]; then
        echo "  app healthy sau ${i}x2s"; break
    fi
    [ "$i" = 30 ] && { echo "  ✖ app không healthy — log:"; docker logs --tail 50 elearning-app; exit 1; }
    sleep 2
done
curl -fsS --max-time 10 "https://${DOMAIN}/api/health" && echo "  https://${DOMAIN}/api/health OK" \
    || echo "  ⚠ chưa truy cập được qua https://${DOMAIN} (DNS/cert đang xin? xem: docker logs elearning-caddy)"

log "Dọn image cũ"
docker image prune -f --filter "until=24h" >/dev/null
echo; echo "✔ Deploy xong: $APP_IMAGE"; docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Size}}' | grep elearning
