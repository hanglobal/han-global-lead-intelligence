/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination: 'http://localhost:5050/api/:path*/',
      },
    ];
  },
};

module.exports = nextConfig;
