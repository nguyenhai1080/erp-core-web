import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.env.ERP_SEED_ON_START === 'true') {
  const cli = fileURLToPath(import.meta.resolve('tsx/cli'));
  const seed = fileURLToPath(new URL('./packages/db/prisma/seed.ts', import.meta.url));
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, seed], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Seed failed (${code ?? signal})`)));
  });
}
await import('./dist/server.js');
