# ─── Thesis Match Maker – Produktions-Dockerfile ────────────────────────────
# Mehrstufiger Build: Abhängigkeiten → Build → schlankes Laufzeitimage

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 thesis
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle ./drizzle
RUN mkdir -p /app/storage-data && chown thesis:nodejs /app/storage-data
USER thesis
EXPOSE 3000
CMD ["node", "dist/index.js"]

