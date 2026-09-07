#!/usr/bin/env sh
# Khôi phục 1 bản backup từ R2 vào container db (VPS mới hoặc sau sự cố).
#   ./restore-db.sh                       # bản mới nhất
#   ./restore-db.sh elearning-2026...dump # bản cụ thể
# CẢNH BÁO: --clean xoá object hiện có trong DB đích trước khi nạp.
set -eu
DB_CONTAINER="${DB_CONTAINER:-elearning-platform-db-1}"
DB_USER="${DB_USER:-elearning_user}"
DB_NAME="${DB_NAME:-elearning}"
RCLONE_REMOTE="${RCLONE_REMOTE:-r2}"
BUCKET="${BUCKET:-elearning-backup}"

FILE="${1:-$(rclone lsf "$RCLONE_REMOTE:$BUCKET" --include 'elearning-*.dump' | sort | tail -n 1)}"
[ -n "$FILE" ] || { echo "không có bản backup nào trong $BUCKET"; exit 1; }
echo "khôi phục $FILE → $DB_CONTAINER/$DB_NAME"
rclone cat "$RCLONE_REMOTE:$BUCKET/$FILE" \
    | docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner
echo "xong"
