/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ndiipano/shared'],
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'Ndiipano',
    NEXT_PUBLIC_APP_DESCRIPTION: 'Medical Home Care Platform',
  },
};

module.exports = nextConfig;
