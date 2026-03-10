# E-Learning Platform (LMS)

Next.js 14 + Prisma + PostgreSQL — Hệ thống quản lý khóa học (Learning Management System).

## 📋 Tính năng chính

- **Lecturer (Giảng viên)**: Tạo & quản lý khóa học, tải lên video/bài quiz
- **Admin (Quản trị viên)**: Duyệt khóa học, phê duyệt/từ chối
- **Student (Học sinh)**: Đăng ký khóa học, học video, làm bài quiz, theo dõi tiến độ
- **Preview Mode**: Giảng viên xem trước khóa học trước khi submit
- **Validation & Error Handling**: Chi tiết, dễ debug

---

## 🚀 Setup sau khi clone (3 lệnh)

```bash
# 1. Cài đúng Node.js version (đọc từ .mise.toml)
mise install

# 2. Kích hoạt pnpm qua corepack (chỉ cần làm 1 lần trên máy)
corepack enable pnpm

# 3. Cài dependencies từ lockfile (deterministic — giống uv sync)
pnpm install
```

> **Không dùng `npm install` hay `yarn`.** `packageManager` field trong `package.json` enforce pnpm qua corepack.

---

## 🛠️ Dependency Management

| Tool | Vai trò | Tương đương Python |
|------|---------|-------------------|
| `mise` | Quản lý Node.js runtime | `mise` (Python runtime) |
| `.mise.toml` | Pin Node.js version | `.mise.toml` (Python version) |
| `pnpm` | Quản lý packages | `uv` |
| `pnpm-lock.yaml` | Lockfile deterministic | `uv.lock` |
| `corepack` | Enforce đúng package manager | N/A (built-in Node.js) |

### Các lệnh thường dùng

```bash
pnpm install              # Sync packages từ lockfile (sau khi pull)
pnpm add <package>        # Thêm dependency mới
pnpm add -D <package>     # Thêm devDependency
pnpm remove <package>     # Xóa package
pnpm run dev              # Chạy dev server
pnpm run build            # Build production
pnpm run lint             # ESLint check
```

---

## ⚙️ Environment

Copy `.env.example` → `.env` và điền các biến:

```bash
cp .env.example .env
```

**Variables cần thiết:**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret key cho JWT tokens
- `YOUTUBE_API_KEY` — Google API key (optional, for video metadata)

---

## 🗄️ Database

```bash
pnpm prisma migrate dev    # Chạy migrations
pnpm prisma db seed        # Seed dữ liệu mẫu
pnpm prisma studio         # Mở Prisma Studio
```

---

## 📚 Architecture & Documentation

Codebase được tổ chức theo **DDD (Domain-Driven Design)**:

```
src/
├── app/                    # Next.js App Router
│   ├── api/v1/             # REST API endpoints
│   └── [pages]/            # UI pages
├── modules/                # Domain-driven modules
│   └── course-management/  # Controllers → Services → Domain → Repos
├── components/             # Shared React components
├── lib/                    # Client-side API wrappers
└── types/                  # TypeScript types
```

### Tài liệu chi tiết (Tiếng Việt)

- **`docs/codebase/01-database-schema.md`** — Schema DB, 9 bảng, ERD
- **`docs/codebase/02-backend-components.md`** — Tất cả BE components với tên chính xác
- **`docs/codebase/03-backend-dependency-chain.md`** — 43 API endpoint chains (Route → Controller → Service → Domain → Repo)
- **`docs/codebase/04-frontend-components.md`** — 35 FE components (pages, components, lib files)
- **`docs/codebase/05-frontend-dependency-chain.md`** — 23 user flows, component map, navigation map

---

## 🐛 Bug Fixes & Recent Changes

### v1.0.0 (Latest)
- ✅ Fixed YouTube API 400 error — clean error logging (không expose API key)
- ✅ Fixed publish/moderate route methods (PATCH → POST)
- ✅ Fixed autosave UX — in-memory sync only, Save button persists to DB
- ✅ Fixed course.submit() not a function — return Course domain instance
- ✅ Fixed slug unique constraint — append random suffix
- ✅ Fixed delete section ACCESS_DENIED — validate against course.lecturerId
- ✅ Fixed republish after rejection — allow submit() from REJECTED status
- ✅ Added `/api/v1/management/courses/[id]` PUT endpoint — update course metadata

---

## 🔐 Auth Flow

### Access Token (JWT)
- Lưu trong `localStorage`
- Valid 15 phút
- Auto-attach vào headers via Axios interceptor

### Refresh Token
- Lưu trong `httpOnly` cookie
- Valid 7 ngày
- Server-side renewal

---

## 📝 API Status Codes

| Status | Meaning |
|--------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no token/invalid token) |
| 403 | Forbidden (permission denied) |
| 404 | Not Found |
| 409 | Conflict (e.g., duplicate slug) |
| 500 | Internal Server Error |

---

## 🚀 Deployment

### Build for Production

```bash
pnpm run build
pnpm start
```

### Environment Variables (Production)

Set các biến in `.env` hoặc environment của server (VPS/Vercel):
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key
NODE_ENV=production
```

---

## 🤝 Contributing

1. Branch từ `main`: `git checkout -b feature/your-feature`
2. Commit với co-author trailer:
   ```bash
   git commit -m "Fix bug X

   Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
   ```
3. Push & tạo Pull Request

---

## 📞 Support

Xem file log tại `/logs/` hoặc browser DevTools → Console/Network tab.

---

**Last Updated**: Mar 10, 2026
