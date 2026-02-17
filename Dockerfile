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

EXPOSE 80

# Railway routes traffic to $PORT, so we rewrite nginx listen port on container start
CMD ["sh", "-c", "chmod +x /docker-entrypoint.sh && /docker-entrypoint.sh"]