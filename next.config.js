/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // потрібно для Docker (копіюємо .next/standalone + server.js)
  output: 'standalone',

  async rewrites() {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${base}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        // Socket.IO is served over HTTP(S) with Upgrade. Use the same backend base URL.
        destination: `${base}/socket.io/:path*`,
      },
    ]
  },

  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig