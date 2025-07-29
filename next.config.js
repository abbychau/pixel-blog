/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.BUILD_MODE === 'prod' ? '.next-prod' : '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.abby.md',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig