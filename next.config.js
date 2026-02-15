/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // optional proxy if you want /api/* to go to backend
    return [];
  }
};

module.exports = nextConfig;