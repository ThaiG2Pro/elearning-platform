# E-Learning Platform

Next.js 14 + Prisma + PostgreSQL — LMS system.

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
```

## ⚙️ Environment

Copy `.env.example` → `.env` và điền các biến:

```bash
cp .env.example .env
```

## 🗄️ Database

```bash
pnpm prisma migrate dev    # Chạy migrations
pnpm prisma db seed        # Seed dữ liệu mẫu
pnpm prisma studio         # Mở Prisma Studio
```
