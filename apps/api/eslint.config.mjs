import base from '@elo/config/eslint';

export default [
    ...base,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true }
        }
    },
    {
        files: ['**/*.mjs'],
        languageOptions: {
            globals: {
                console: 'readonly',
                process: 'readonly',
                fetch: 'readonly',
                URL: 'readonly'
            }
        }
    }
];
