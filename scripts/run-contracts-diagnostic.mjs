import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const commands = String(pkg.scripts?.['test:contracts'] || '').split('&&').map(s => s.trim()).filter(Boolean);

function esc(text){
  return String(text).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
}

for (const command of commands) {
  const [bin, ...args] = command.split(/\s+/);
  const result = spawnSync(bin, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const combined = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
    const lines = combined.split('\n');
    const location = lines.find(line => /browser-experimental-prototype-smoke\.test\.mjs:\d+/.test(line)) || '';
    const excerpt = [...lines.slice(0,18), '...', ...lines.slice(-10)].join(' | ');
    console.error(`::error title=Contract failed: ${command}::${esc(`${location} | ${excerpt}`)}`);
    process.exit(result.status || 1);
  }
}

console.log('all contract commands: OK');
