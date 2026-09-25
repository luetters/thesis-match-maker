# ─── Thesis Match Maker – Produktions-Dockerfile ────────────────────────────
# Mehrstufiger Build: Abhängigkeiten → Build → schlankes Laufzeitimage

FROM node:22-alpine AS base
WORKDIR /app

# Node 22 liefert Corepack mit wechselnden Signaturschlüsseln aus. Das kann auf
# neuen Docker-Hosts beim Aktivieren scheitern. pnpm wird deshalb reproduzierbar
# in der zur Sperrdatei passenden Version installiert.
RUN npm install --global pnpm@10.4.1

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY vendor ./vendor
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 thesis
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/scripts/selfhosted/bootstrap-superadmin.mjs ./scripts/selfhosted/bootstrap-superadmin.mjs
RUN mkdir -p /app/storage-data && chown thesis:nodejs /app/storage-data
USER thesis
EXPOSE 3000
CMD ["node", "dist/index.js"]
