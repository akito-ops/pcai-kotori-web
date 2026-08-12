import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');

assert.match(html, /PCAI WEB v0\.4\.0-beta/);
assert.match(html, /PCAI Web v0\.4\.0-beta/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /default-src 'self'/);
assert.match(html, /script-src 'self'/);
assert.match(html, /connect-src https:\/\/pcai-kotori-backend\.siryuuakito\.workers\.dev/);
assert.match(html, /object-src 'none'/);
assert.match(html, /base-uri 'none'/);
assert.doesNotMatch(html, /https?:\/\/(?!pcai-kotori-backend\.siryuuakito\.workers\.dev)[^"'\s>]+\.js/,
  'prototype must not load external scripts');
assert.match(html, /bootstrap\.js\?v=0\.4\.0-beta/);
assert.match(readme, /v0\.4\.0-beta/);
assert.match(readme, /fail-safe fallback/);
assert.match(readme, /有料APIへの自動fallbackは無効/);

console.log('prototype safety contract: OK');
