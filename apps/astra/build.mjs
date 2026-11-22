import { cp, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const threeBuild = dirname(require.resolve('three'));
const dist = join(here, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'vendor'), { recursive: true });
await cp(join(here, 'src'), dist, { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) {
  await cp(join(threeBuild, file), join(dist, 'vendor', file));
}
await cp(join(threeBuild, '..', 'LICENSE'), join(dist, 'vendor', 'THREE-LICENSE.txt'));
await cp(join(here, '../../LICENSES/ODbL-1.0.txt'), join(dist, 'ODbL-1.0.txt'));
await cp(join(here, '../../LICENSES/TERRAIN.md'), join(dist, 'TERRAIN.md'));
