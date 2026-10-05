# Security

*[Tiếng Việt bên dưới](#bảo-mật)*

## Reporting a vulnerability

Please do **not** open a public issue. Email **thainguyenax00@gmail.com** with the subject `[spacely security]`, including steps to reproduce and the affected version or commit. You will get an acknowledgement within 72 hours.

Only the `main` branch is supported.

## What is already in place

- Single JWT verification point; refresh tokens rotated via httpOnly cookies, signed OAuth `state`.
- Rate limiting on every resource-heavy endpoint (AI generation, support chat, upload, auth).
- SSRF guard when fetching external URLs; upload size limits.
- Stripe webhooks verified by signature and processed idempotently.
- CI runs `pnpm audit --prod --audit-level=high` on every push.

Secrets live only in `.env` (git-ignored); `.env.example` holds placeholders.

---

# Bảo mật

## Báo lỗ hổng

Xin **đừng** mở issue công khai. Gửi email tới **thainguyenax00@gmail.com**, tiêu đề `[spacely security]`, kèm cách tái hiện và commit bị ảnh hưởng. Sẽ có phản hồi trong 72 giờ.

Chỉ nhánh `main` được hỗ trợ.
