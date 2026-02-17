FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
# якщо lock є — скопіюємо; якщо нема — цей крок не впаде
COPY package-lock.json* ./

# npm ci тільки при наявності lock, інакше — npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]