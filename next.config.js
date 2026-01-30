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
  // Ensure serverless compatibility
  output: process.env.ELECTRON_BUILD ? 'export' : undefined,
};

module.exports = nextConfig;
