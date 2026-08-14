import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const commands = String(pkg.scripts?.['test:contracts'] || '').split('&&').map(s => s.trim()).filter(Boolean);

for (const command of commands) {
  const [bin, ...args] = command.split(/\s+/);
  const result = spawnSync(bin, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const tail = `${result.stdout || ''}\n${result.stderr || ''}`.trim().split('\n').slice(-8).join(' | ').replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
    console.error(`::error title=Contract failed: ${command}::${tail}`);
    process.exit(result.status || 1);
  }
}

console.log('all contract commands: OK');
