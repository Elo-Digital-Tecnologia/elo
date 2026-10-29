// Dev da API: recompila em modo watch e reinicia o servidor quando a API ou o @elo/core mudam.
// (O core é lido do dist; sem isso, mudar o core exigia rodar o build à mão.)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
const run = (args) => spawn(process.execPath, args, { stdio: 'inherit' });

// Primeira compilação completa: o servidor precisa de dist/main.js.
const first = run([tsc, '-p', 'tsconfig.build.json']);
first.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  const watcher = run([tsc, '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput']);
  const server = run(['--watch', '--watch-path=dist', '--watch-path=../../packages/core/dist', 'dist/main.js']);
  const stop = () => {
    watcher.kill();
    server.kill();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  server.on('exit', (c) => {
    watcher.kill();
    process.exit(c ?? 0);
  });
});
