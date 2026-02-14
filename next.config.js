/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        // Socket.IO is served over HTTP(S) with Upgrade. Use the same backend base URL.
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/socket.io/:path*`,
      },
    ];
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig