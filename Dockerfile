# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app

# Needed for some npm packages
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# install (auto-detect)
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm i; fi

# ---- build ----
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# build (auto-detect)
RUN \
  if [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm run build; \
  elif [ -f yarn.lock ]; then yarn build; \
  else npm run build; fi

# ---- run ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output (рекомендовано)
# Якщо у тебе не включено output: 'standalone' — нижче дам що зробити
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]