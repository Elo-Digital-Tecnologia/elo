const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/** @type {import('next').NextConfig} */
export default {
  // Permite compilar (`build`) e servir (`dev`) em pastas diferentes: NEXT_DIST_DIR=.next-dev next dev
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion', '@elo/ui'] },
  transpilePackages: ['@elo/ui', '@elo/client'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  },
};
