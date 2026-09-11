#!/usr/bin/env bash
# Bootstrap VPS mới (Ubuntu 22.04/24.04, 1 vCPU 2GB, ổ 16GB) cho elearning-platform.
# Chạy 1 lần bằng root:  bash scripts/ops/vps-setup.sh
# Idempotent — chạy lại không hỏng gì.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/elearning}"
REPO="${REPO:-https://github.com/ThaiG2Pro/elearning-platform.git}"
SWAP_SIZE="${SWAP_SIZE:-1G}"

log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }

[ "$(id -u)" = 0 ] || { echo "chạy bằng root (sudo -i)"; exit 1; }

log "Cập nhật hệ thống + gói cơ bản"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git ufw fail2ban unattended-upgrades cron >/dev/null

log "Docker"
if ! command -v docker >/dev/null; then
    curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
# Log rotation toàn cục (ổ 16GB) + không để container ghi log vô hạn.
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true
}
JSON
systemctl restart docker

log "Swap $SWAP_SIZE (JSDOM/AI đột biến không bị OOM kill)"
if ! swapon --show | grep -q /swapfile; then
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
# Ưu tiên RAM, swap chỉ là phao cứu sinh.
sysctl -w vm.swappiness=10 >/dev/null
grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf

log "Firewall: chỉ mở 22/80/443"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null   # HTTP/3
ufw --force enable >/dev/null

log "fail2ban (sshd) + unattended-upgrades"
systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

log "rclone (backup → Cloudflare R2)"
command -v rclone >/dev/null || curl -fsSL https://rclone.org/install.sh | bash >/dev/null

log "Clone repo → $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" pull -q --ff-only
else
    git clone -q --depth 1 "$REPO" "$APP_DIR"
fi
chmod +x "$APP_DIR"/scripts/ops/*.sh
[ -f "$APP_DIR/.env" ] || { cp "$APP_DIR/deploy/.env.production.example" "$APP_DIR/.env"; chmod 600 "$APP_DIR/.env"; }

log "Cron: backup 2 lần/tuần (chỉ upload khi đổi) + dọn image cũ hàng tuần + cảnh báo Telegram hàng giờ"
cat > /etc/cron.d/elearning <<CRON
0 3 * * 3,0  root  $APP_DIR/scripts/ops/backup-db.sh >> /var/log/elearning-backup.log 2>&1
30 4 * * 1   root  docker image prune -af --filter "until=168h" >> /var/log/elearning-prune.log 2>&1
0 * * * *    root  $APP_DIR/scripts/ops/alert.sh >> /var/log/elearning-alert.log 2>&1
CRON
chmod 644 /etc/cron.d/elearning

cat <<MSG

✔ Máy đã sẵn sàng. Việc còn lại làm tay:
  1. Điền $APP_DIR/.env   (mẫu: deploy/.env.production.example)
  2. docker login ghcr.io -u <github-user>   (PAT scope read:packages, nếu package private)
  3. rclone config  → remote tên "r2" (S3 / Cloudflare R2), tạo bucket elearning-backup
  4. Trỏ DNS A record của DOMAIN về IP máy này
  5. $APP_DIR/scripts/ops/preflight.sh   → sửa cho tới khi toàn PASS
  6. $APP_DIR/scripts/ops/deploy.sh
MSG
