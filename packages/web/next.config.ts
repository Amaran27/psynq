import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['@psynq/core'],
  // Allow dev requests from loopback alias (127.0.0.1) as well as localhost to avoid
  // cross-origin warnings during development (see Next.js `allowedDevOrigins`).
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // Configure turbopack explicitly to avoid build errors when custom webpack config present
  // Keep it empty to avoid migration path issues for now
  turbopack: {},
};

export default nextConfig;
