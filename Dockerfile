# ---- build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Краще кешується: спершу лише маніфести
COPY package*.json ./
RUN npm ci --no-audit --progress=false

# Потім код
COPY . .

# Білд Next.js (без телеметрії)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- run stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Лише потрібні файли
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/app ./app

# Встановлюємо тільки прод-залежності
RUN npm ci --omit=dev --no-audit --progress=false

EXPOSE 3000
CMD ["npm", "start"]