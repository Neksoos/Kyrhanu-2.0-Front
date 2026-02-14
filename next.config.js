/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  async rewrites() {
    const base =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      'http://localhost:8000'

    return [
      {
        source: '/api/:path*',
        destination: `${base}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${base}/socket.io/:path*`,
      },
    ]
  },

  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig