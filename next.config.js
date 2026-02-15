/** @type {import('next').NextConfig} */

const normalize = (raw) => {
  if (!raw) return ''
  let v = String(raw).trim()
  // remove trailing slash
  v = v.replace(/\/+$/, '')
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  return `https://${v}`
}

// IMPORTANT:
// Next.js rewrites are evaluated at build time, so make sure this env var is present in Railway **build** variables too.
const API_BASE =
  normalize(process.env.NEXT_PUBLIC_API_URL) ||
  normalize(process.env.NEXT_PUBLIC_API_BASE) ||
  normalize(process.env.API_URL) ||
  normalize(process.env.API_BASE) ||
  'http://localhost:8000'

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

module.exports = nextConfig