FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Runtime env generator (writes /usr/share/nginx/html/config.js)
COPY docker-entrypoint.sh /docker-entrypoint.sh

# ✅ make sure it is executable at build time (Railway start command can execute file directly)
RUN chmod 755 /docker-entrypoint.sh

EXPOSE 80

# ✅ run via sh (works even if platform doesn't exec scripts as start command)
ENTRYPOINT ["sh", "/docker-entrypoint.sh"]