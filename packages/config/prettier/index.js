export default {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss'],
  // Tailwind v4 is CSS-first: point the sorter at the stylesheet, not a JS config.
  tailwindStylesheet: './packages/ui/src/styles/globals.css'
};