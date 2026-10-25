// Flat ESLint config (ESLint 9) for this Next.js app.
// eslint-config-next still ships legacy .eslintrc-style configs, so we
// bridge them into the flat format with FlatCompat.
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const compat = new FlatCompat({
    baseDirectory: path.dirname(fileURLToPath(import.meta.url))
});

export default [
    { ignores: ['.next/**', 'node_modules/**'] },
    ...compat.extends('next/core-web-vitals', 'next/typescript')
];
