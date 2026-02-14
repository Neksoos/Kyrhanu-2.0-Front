/** @type {import('next').NextConfig} */

function normalizeRewriteUrl(url) {
  if (!url) return url;
  // Next rewrites allow only /, http://, https://
  return url
    .replace(/^wss:\/\//i, 'https://')
    .replace(/^ws:\/\//i, 'http://');
}

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiBase = normalizeRewriteUrl(process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:8000';
    const wsBaseRaw = process.env.NEXT_PUBLIC_WS_URL || apiBase;
    const wsBase = normalizeRewriteUrl(wsBaseRaw) || apiBase;

    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${wsBase}/socket.io/:path*`,
      },
    ];
  },
  images: {
    domains: ['localhost'],
  },
};

module.exports = nextConfig;
