/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  // Skip type checking during build for faster deploys
  typescript: {
    ignoreBuildErrors: process.env.VERCEL === '1',
  },
  eslint: {
    ignoreDuringBuilds: process.env.VERCEL === '1',
  },
  // For Electron: use standalone mode to bundle Next.js server
  // For Vercel: use default (no output specified)
  output: process.env.ELECTRON_BUILD ? 'standalone' : undefined,
};

module.exports = nextConfig;
