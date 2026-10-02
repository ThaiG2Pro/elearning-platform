# Phát triển local

Chi tiết cho người sửa code. Phần "chạy thử 5 phút" nằm ở README gốc.

## Toolchain

| Tool | Vai trò |
|------|---------|
| `mise` + `.mise.toml` | Pin Node.js (hiện Node 24) |
| `pnpm` qua `corepack` | Package manager, enforce bởi `packageManager` trong `package.json` |
| `pnpm-lock.yaml` | Lockfile, luôn commit |

```bash
mise install          # Node đúng version
corepack enable pnpm  # 1 lần / máy
pnpm install          # sync từ lockfile
```

Không dùng `npm install` hay `yarn`.

## Lệnh thường dùng

```bash
pnpm dev               # Next.js dev server (turbopack), :3000
pnpm build && pnpm start
pnpm typecheck         # tsc --noEmit
pnpm lint              # next lint
pnpm test              # vitest (unit + integration, 40 file / 387 test)
pnpm test:coverage
pnpm check:tokens      # design token lint (scripts/check-design-tokens.js)
```

## Database

Postgres chạy bằng `docker compose up -d db` (port 15432, xem `docker-compose.yml`).

```bash
pnpm prisma migrate dev     # tạo/áp migration khi sửa schema
pnpm prisma migrate deploy  # áp migration (prod / DB sạch)
pnpm prisma studio
```

Seed có 2 loại, đừng nhầm:

| Lệnh | Dùng khi | Tính chất |
|---|---|---|
| `pnpm prisma db seed` (`prisma/seed.ts`) | dev/QA | **xoá sạch DB**, có guard chỉ chạy với DB local |
| `pnpm seed:launch` | lần đầu public app | additive, idempotent: 58 playlist tuyển chọn (`seed:playlists`), showcase (`seed:showcase`), social proof (`seed:active-users`) |

## Biến môi trường

`cp .env.example .env`. Bắt buộc: `DATABASE_URL`, `JWT_SECRET`. Nhóm còn lại
(OAuth, LiteLLM/AI, Stripe, mail, YouTube API, agent CSKH) đều có chú thích
trong `.env.example`; thiếu nhóm nào thì tính năng đó tự tắt, app vẫn chạy.

## Auth

- Access token JWT 15 phút, lưu `localStorage`, gắn qua Axios interceptor (`src/lib/api.ts`).
- Refresh token 7 ngày, cookie `httpOnly`, làm mới phía server.
- Một điểm xác thực duy nhất: `src/shared/middleware/auth.ts` (`getRequestContext`). Không parse JWT ở chỗ khác.
- OAuth Google/GitHub: `src/modules/auth/oauth/`.

## Quy ước API

`/api/v1/*`, JSON. Mã lỗi: 400 validation, 401 chưa đăng nhập, 403 không có quyền,
404, 409 trùng (slug, idempotency), 429 rate limit (`src/shared/middleware/rateLimit.ts`), 500.
Lỗi trả `{ error: 'MA_LOI' }` dạng hằng để client switch, không trả message tự do.

## Cấu trúc code

```
src/
├── app/              Next.js App Router: trang + /api/v1 route handlers
├── modules/          DDD theo domain: auth, space-management, ai-generation, billing, data-retention
│   └── <module>/     controllers → services → domain (policy, entity) → repositories (Prisma)
├── shared/           adapters (YouTube, email, web), middleware (auth, rateLimit), security, validation
├── components/       React components dùng chung (vibe/* = design system "ink")
├── content/          Nội dung chữ dùng chung trang + bot CSKH (faq.ts, siteInfo.ts)
├── lib/              client-side API wrappers
└── types/
prisma/               schema, migrations, seed scripts
scripts/              vận hành: usage report, archive dữ liệu cũ, reconcile credit
deploy/               Caddyfile + docker-compose.prod.yml (VPS)
litellm/              config LiteLLM proxy (model alias, fallback)
```

## Vận hành

- `docs/DEPLOY.md`: deploy Fly.io / VPS, chuỗi migrate → seed.
- `docs/RUNBOOK.md`: sự cố thường gặp.
- `docs/LAUNCH_CHECKLIST.md`: checklist trước khi public.
- Cron nội bộ: `/api/internal/*` (reconcile credit, archive dữ liệu), bảo vệ bằng `INTERNAL_CRON_SECRET`.

## Contributing

Branch từ `main`, PR vào `main`. CI (`.github/workflows/ci.yml`): typecheck → lint → audit dependency → design tokens → test + coverage → build → (main) build & push Docker image.
