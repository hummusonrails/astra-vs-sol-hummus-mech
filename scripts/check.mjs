import { readFile, readdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const results = JSON.parse(await readFile(join(root, 'benchmark/results.json'), 'utf8'));
assert.equal(results.runs.length, 2);
for (const run of results.runs) {
  assert(run.agent_duration_seconds <= results.limit_seconds);
  assert(run.usage.output_tokens > 0);
  assert(run.usage.cached_input_tokens <= run.usage.input_tokens);
  assert(Object.values(run.independent_acceptance).every(Boolean));
}
for (const label of ['astra', 'sol']) {
  const dist = join(root, 'apps', label, 'dist');
  for (const file of ['index.html', 'ODbL-1.0.txt', 'TERRAIN.md']) await access(join(dist, file));
  const dataPath = label === 'astra' ? 'district.json' : 'data/district.json';
  const data = JSON.parse(await readFile(join(dist, dataPath), 'utf8'));
  const result = results.runs.find(run => run.model.endsWith(label));
  assert.equal(data.roads.length, result.geography.roads_total);
  assert.equal(data.buildings.length, result.geography.buildings_total);
}
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'test-results', '.venv', '__pycache__'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path);
  }
  return files;
}
for (const file of await walk(root)) {
  if (/\.m?js$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  if (file.endsWith('.md')) {
    const text = await readFile(file, 'utf8');
    for (const [, geojson] of text.matchAll(/```geojson\n([\s\S]*?)\n```/g)) assert.equal(JSON.parse(geojson).type, 'FeatureCollection');
    const targets = [...text.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g), ...text.matchAll(/(?:src|href)="([^"\s]+)"/g)];
    for (const [, target] of targets) {
      if (/^(?:https?:|mailto:|#)/.test(target) || /^\.\.\/\.\.\/issues(?:\/|$)/.test(target)) continue;
      const local = target.split('#')[0];
      if (local) await access(resolve(dirname(file), decodeURIComponent(local)));
    }
  }
}
console.log('Build artifacts, recorded metrics, JavaScript syntax and local documentation links passed.');
