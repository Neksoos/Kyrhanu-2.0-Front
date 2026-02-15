// next.config.mjs
const normalize = (raw) => {
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `https://${raw}`
}

const API_BASE =
  normalize(process.env.NEXT_PUBLIC_API_URL) ||
  normalize(process.env.NEXT_PUBLIC_API_BASE) ||
  normalize(process.env.API_URL) ||
  normalize(process.env.API_BASE) ||
  'http://localhost:8000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
    ]
  },
}

export default nextConfig