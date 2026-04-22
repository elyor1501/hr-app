/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Use Docker bridge IP for server-side API calls
        destination: 'http://172.17.0.1:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;