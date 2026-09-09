# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build the application ────────────────────────────────────────────
FROM node:24-alpine AS builder
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm exec prisma generate

# Build Next.js (standalone output for minimal image)
# Ops (2026-09-09): biến NEXT_PUBLIC_* được nướng vào bundle LÚC BUILD, set ở
# runtime không có tác dụng — CI truyền qua --build-arg (ci.yml, GitHub vars).
ARG NEXT_PUBLIC_DONATE_URL=""
ENV NEXT_PUBLIC_DONATE_URL=$NEXT_PUBLIC_DONATE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# ── Stage 3: Production runtime ───────────────────────────────────────────────
FROM node:24-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Perf (2026-09-06): VPS nhỏ (512MB–1GB). Ép V8 GC sớm thay vì để kernel
# OOM-kill cả process. Override bằng `-e NODE_OPTIONS=...` nếu máy có nhiều RAM.
ENV NODE_OPTIONS="--max-old-space-size=384"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only what's needed for runtime
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma: client sinh ra + engine đã được Next standalone trace sẵn vào
# node_modules/.pnpm/@prisma+client@*/node_modules/.prisma (pnpm KHÔNG có
# node_modules/.prisma ở top-level — COPY đường đó sẽ fail). Chỉ cần thêm schema.
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Ops (2026-09-09): /api/health ping DB; busybox wget có sẵn trong alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
