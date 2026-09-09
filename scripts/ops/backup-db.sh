#!/usr/bin/env sh
# Backup Postgres → Cloudflare R2 (tier miễn phí 10GB) — tối ưu cho VPS 1GB
# ít user (quyết định nhóm E, 2026-09-06).
#
# Nguyên tắc tiết kiệm:
#   1. Chạy theo cron nhưng CHỈ upload khi dữ liệu thật sự đổi — so hash bản
#      dump với hash lần upload trước (lưu ở $STATE_FILE). App ít user thì đa
#      số lần chạy kết thúc ở bước này, 0 byte lên mạng, vài giây CPU.
#   2. pg_dump định dạng custom (-Fc) đã nén, app này chỉ vài MB.
#   3. Giữ $KEEP bản gần nhất trên R2, bản cũ hơn xoá tự động.
#
# Cron gợi ý (2 lần/tuần, 3h sáng thứ 4 và chủ nhật — nếu không đổi thì bỏ qua):
#   0 3 * * 3,0  /opt/elearning/scripts/ops/backup-db.sh >> /var/log/elearning-backup.log 2>&1
# Chạy tay trước mỗi lần deploy/migrate:  FORCE=1 ./backup-db.sh
#
# Cần: docker (container db), rclone đã cấu hình remote tên $RCLONE_REMOTE
# trỏ R2 (rclone config → S3 → Cloudflare R2, endpoint <account>.r2.cloudflarestorage.com).
set -eu

DB_CONTAINER="${DB_CONTAINER:-elearning-db}"
DB_USER="${DB_USER:-elearning_user}"
DB_NAME="${DB_NAME:-elearning}"
RCLONE_REMOTE="${RCLONE_REMOTE:-r2}"
BUCKET="${BUCKET:-elearning-backup}"
KEEP="${KEEP:-8}"
STATE_FILE="${STATE_FILE:-/var/lib/elearning-backup.last-hash}"
WORKDIR="${WORKDIR:-/tmp/elearning-backup}"

mkdir -p "$WORKDIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP="$WORKDIR/elearning-$STAMP.dump"

# -Fc: nén sẵn; --no-owner để restore được vào user khác nếu đổi VPS.
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner > "$DUMP"

# pg_dump -Fc ghi timestamp vào header → hash file nhị phân luôn khác. Hash
# bản plain-text (schema + data) do pg_restore in ra, bỏ các dòng comment có
# thời gian — nội dung DB không đổi thì hash không đổi.
HASH="$(docker exec -i "$DB_CONTAINER" pg_restore --no-owner -f - < "$DUMP" \
        | grep -v '^-- Dumped\|^-- Started\|^-- Completed' | sha256sum | cut -d' ' -f1)"
LAST="$(cat "$STATE_FILE" 2>/dev/null || true)"

if [ "${FORCE:-0}" != "1" ] && [ "$HASH" = "$LAST" ]; then
    echo "[$STAMP] không đổi so với bản trước, bỏ qua upload"
    rm -f "$DUMP"
    exit 0
fi

SIZE="$(du -h "$DUMP" | cut -f1)"
rclone copyto "$DUMP" "$RCLONE_REMOTE:$BUCKET/elearning-$STAMP.dump" --s3-no-check-bucket
echo "$HASH" > "$STATE_FILE"
rm -f "$DUMP"
echo "[$STAMP] đã upload $SIZE → $BUCKET"

# Xoá bản cũ, giữ $KEEP bản mới nhất (tên file có timestamp nên sort được).
rclone lsf "$RCLONE_REMOTE:$BUCKET" --include 'elearning-*.dump' | sort | head -n -"$KEEP" \
    | while read -r old; do
        [ -n "$old" ] && rclone deletefile "$RCLONE_REMOTE:$BUCKET/$old" && echo "  xoá bản cũ $old"
    done
exit 0
