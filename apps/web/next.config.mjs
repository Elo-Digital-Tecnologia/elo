const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/**
 * O dev usa `.next-dev` e o build/start usam `.next`: rodar um não estraga o outro.
 * NEXT_DIST_DIR sobrescreve a pasta, se precisar.
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
export default (phase) => ({
  distDir: process.env.NEXT_DIST_DIR || (phase === 'phase-development-server' ? '.next-dev' : '.next'),
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion', '@elo/ui'] },
  transpilePackages: ['@elo/ui', '@elo/client'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  },
});
