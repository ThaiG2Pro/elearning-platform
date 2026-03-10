# Copilot Instructions – E-Learning Platform (LMS)

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint (next/core-web-vitals)
npx prisma db seed   # Seed database (ts-node prisma/seed.ts)
npx prisma migrate dev  # Run DB migrations
```

> No test suite is configured (`npm test` exits with error).

---

## Architecture

The project combines **Next.js 14 App Router** for UI/routing with a **DDD-inspired backend layer** inside `src/modules/`.

### Request Flow

```
Browser
  → src/app/api/v1/[domain]/[action]/route.ts   (thin Next.js route – validation & HTTP only)
  → src/modules/[domain]/controllers/            (orchestration entry point)
  → src/modules/[domain]/services/               (one service per use case)
  → src/modules/[domain]/domain/                 (pure business logic, no Prisma/framework)
  → src/modules/[domain]/repositories/           (Prisma queries)
```

### Directory Map

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/v1/             # Route files (call module controllers)
│   └── [page-routes]/      # UI pages (page.tsx per route)
├── components/             # Shared React components (Header, Toast, CourseCard, etc.)
├── lib/                    # Client-side service layer (Axios wrappers per domain)
├── modules/
│   ├── auth/               # controllers, services, domain, repositories, dtos
│   └── course-management/  # same structure
├── shared/
│   ├── adapters/           # EmailAdapter, YouTubeAdapter, ExcelAdapter
│   ├── middleware/         # auth.ts (JWT middleware)
│   └── config/             # database.ts (Prisma client singleton)
└── types/                  # *.types.ts – API response/request shapes
```

Design artifacts live in `docs/design/` — consult them before coding any layer:

| Layer | Document |
|---|---|
| Domain / Entities | `docs/design/domain-model.md`, `docs/design/class.md` |
| Business Rules | `docs/design/cluster[x]/business-rules.md` |
| Services / Use Cases | `docs/design/use-case.md`, `docs/design/cluster[x]/sequence-diagram.md` |
| Controllers / APIs | `docs/design/api-contract.md` |
| Repositories / DB | `docs/design/erd.md` |
| UI Screens / States | `docs/design/UI_design.md` |

---

## Key Conventions

### API Routes Are Thin Wrappers
`src/app/api/v1/auth/login/route.ts` does **only** HTTP parsing + error-to-status-code mapping, then delegates to `AuthController`. No business logic lives in route files.

### Auth Tokens: Dual Storage
- **Access token** → `localStorage` via `AuthUtils` class (`src/lib/auth.ts`)
- **Refresh token** → `httpOnly` cookie set by the login route
- Axios instance (`src/lib/api.ts`) auto-attaches `Authorization: Bearer <token>` via request interceptor

### DTOs Are Constructors
Each use case has paired `[Action]Dto.ts` and `[Action]ResponseDto.ts` in `modules/[domain]/dtos/`. Instantiate with `new LoginDto(email, password, continueUrl)` — not plain objects.

### Domain Layer Is Framework-Free
Files under `modules/[domain]/domain/` must not import Prisma, Next.js, or any adapter. Pure TypeScript entities and policy classes only.

### No Business Logic on the Frontend
`src/lib/` functions are API call wrappers only. Calculations and validations belong in BE services/policies. FE translates BE error codes to user messages per `docs/design/UI_design.md` Error Mapping.

### Error Code Pattern
BE throws named string errors (e.g., `'AUTH_FAILED'`, `'PASSWORD_TOO_SHORT'`). Routes convert them to `{ code, message }` JSON with appropriate HTTP status. FE catches `error.response?.data?.code` and maps to UI messages — never use freeform strings.

### TypeScript Types
All API shapes are defined in `src/types/*.types.ts`. Never use `any`. Type files are named `[domain].types.ts`.

### Roles
User roles are stored in a `roles` table (`id`, `name`). The `users` table has a `role_id` FK. Role names used in business rules: check `docs/design/domain-model.md`.

### UI State Pattern
Every page manages explicit states: `idle | loading | error | success`. Always handle all four — never assume API calls succeed.
