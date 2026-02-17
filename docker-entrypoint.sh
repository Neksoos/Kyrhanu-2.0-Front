#!/bin/sh
set -eu

# 1) Set nginx listen port for Railway.
PORT_TO_USE="${PORT:-80}"
sed -i "s/listen 80;/listen ${PORT_TO_USE};/" /etc/nginx/conf.d/default.conf

# 2) Generate runtime config.js
cat > /usr/share/nginx/html/config.js <<EOF
// Generated at container start. Do not commit.
window.__ENV__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-}",
  VITE_API_DEBUG: "${VITE_API_DEBUG:-}",
  VITE_TG_BOT_USERNAME: "${VITE_TG_BOT_USERNAME:-}",
};
EOF

exec nginx -g 'daemon off;'