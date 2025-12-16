import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['@psynq/core'],
  // Configure turbopack explicitly to avoid build errors when custom webpack config present
  // Keep it empty to avoid migration path issues for now
  turbopack: {},
};

export default nextConfig;
