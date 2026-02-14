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
        destination: `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/socket.io/:path*`,
      },
    ];
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig