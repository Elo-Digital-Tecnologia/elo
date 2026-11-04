import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT_ENV = new URL('../../.env', import.meta.url);
if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV);

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const API_PREFIX = process.env.API_PREFIX ?? 'api';

/**
 * Dev uses `.next-dev` and build/start use `.next`: running one does not break the other.
 * NEXT_DIST_DIR overrides the folder, if needed.
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
export default (phase) => ({
    distDir:
        process.env.NEXT_DIST_DIR ||
        (phase === 'phase-development-server' ? '.next-dev' : '.next'),
    // The container image runs the self-contained server; local `next start` keeps the regular build.
    ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {}),
    experimental: {
        optimizePackageImports: ['lucide-react', 'framer-motion'],
        outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url))
    },
    transpilePackages: ['@elo/ui', '@elo/client'],
    async rewrites() {
        return [
            { source: '/api/:path*', destination: `${API_URL}/${API_PREFIX}/:path*` }
        ];
    }
});
