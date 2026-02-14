/** @type {import('next').NextConfig} */
const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'

const nextConfig = {
  reactStrictMode: true,

  // ВАЖЛИВО: rewrites залишаємо ТІЛЬКИ якщо apiBase реально заданий у Railway.
  // Якщо env не підхопиться — впаде на localhost.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${apiBase}/socket.io/:path*`,
      },
    ]
  },

  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig