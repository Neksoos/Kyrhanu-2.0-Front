#!/bin/sh
set -eu

# 1) Set nginx listen port for Railway.
PORT_TO_USE="${PORT:-80}"
sed -i "s/listen 80;/listen ${PORT_TO_USE};/" /etc/nginx/conf.d/default.conf

# 2) Generate runtime config.js
# Railway інколи використовує NEXT_PUBLIC_* змінні. Підтягуємо їх як fallback.
API_BASE_URL="${VITE_API_BASE_URL:-${NEXT_PUBLIC_API_BASE:-${NEXT_PUBLIC_API_BASE_URL:-}}}"
TG_BOT_USERNAME="${VITE_TG_BOT_USERNAME:-${NEXT_PUBLIC_TG_BOT_USERNAME:-}}"
API_DEBUG="${VITE_API_DEBUG:-${NEXT_PUBLIC_API_DEBUG:-}}"

cat > /usr/share/nginx/html/config.js <<EOF_JS
// Generated at container start. Do not commit.
window.__ENV__ = {
  // Vite-style
  VITE_API_BASE_URL: "${API_BASE_URL}",
  VITE_API_DEBUG: "${API_DEBUG}",
  VITE_TG_BOT_USERNAME: "${TG_BOT_USERNAME}",

  // Next.js-style (also exposed for transparency)
  NEXT_PUBLIC_API_BASE: "${NEXT_PUBLIC_API_BASE:-}",
  NEXT_PUBLIC_API_BASE_URL: "${NEXT_PUBLIC_API_BASE_URL:-}",
  NEXT_PUBLIC_API_DEBUG: "${NEXT_PUBLIC_API_DEBUG:-}",
  NEXT_PUBLIC_TG_BOT_USERNAME: "${NEXT_PUBLIC_TG_BOT_USERNAME:-}",
};
EOF_JS

exec nginx -g 'daemon off;'