/** @type {import('next').NextConfig} */
const backendBaseUrl = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
  'http://localhost:5050'
).replace(/\/+$/, '');

const nextConfig = {
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination: `${backendBaseUrl}/api/:path*/`,
      },
    ];
  },
};

module.exports = nextConfig;
