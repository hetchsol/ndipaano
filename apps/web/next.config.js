/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ndipaano/shared'],
  output: process.env.STANDALONE === 'true' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'Ndipaano',
    NEXT_PUBLIC_APP_DESCRIPTION: 'Medical Home Care Platform',
  },
};

module.exports = nextConfig;
