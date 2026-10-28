const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/** @type {import('next').NextConfig} */
export default {
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion', '@elo/ui'] },
  transpilePackages: ['@elo/ui', '@elo/client'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  },
};
