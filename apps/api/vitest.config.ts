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
                    include: ['test/**/*.e2e-spec.ts'],
                    setupFiles: ['test/setup-env.ts'],
                    testTimeout: 30_000,
                    hookTimeout: 60_000
                }
            }
        ]
    }
});
