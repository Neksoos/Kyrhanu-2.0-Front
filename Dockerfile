# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Build-time public env (Next.js inlines NEXT_PUBLIC_* during build)
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_TG_BOT_USERNAME
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
ENV NEXT_PUBLIC_TG_BOT_USERNAME=${NEXT_PUBLIC_TG_BOT_USERNAME}

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Next build output
COPY --from=build /app/.next ./.next
COPY --from=build /app/app ./app
COPY --from=build /app/components ./components
COPY --from=build /app/lib ./lib
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/postcss.config.js ./postcss.config.js
COPY --from=build /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
# (якщо у тебе є public/ — просто розкоментуй)
# COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/next start -p ${PORT:-3000}"]