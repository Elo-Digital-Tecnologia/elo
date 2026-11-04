import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import path from 'node:path';

const alias = [
    { find: /^#\/(.*)$/, replacement: path.resolve(import.meta.dirname, 'src/$1') }
];

export default defineConfig({
    plugins: [swc.vite({ module: { type: 'es6' } })],
    test: {
        projects: [
            {
                extends: true,
                resolve: { alias },
                test: { name: 'unit', include: ['src/**/*.spec.ts'] }
            },
            {
                extends: true,
                resolve: { alias },
                test: {
                    name: 'e2e',
                    include: ['test/e2e/**/*.e2e-spec.ts'],
                    globalSetup: ['test/global-setup.ts'],
                    setupFiles: ['test/setup-env.ts'],
                    pool: 'forks',
                    // One app import per worker instead of one per file.
                    isolate: false,
                    testTimeout: 30_000,
                    hookTimeout: 60_000
                }
            }
        ]
    }
});
