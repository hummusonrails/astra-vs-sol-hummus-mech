import { build } from 'vite';
import { cp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
await build();
for (const name of ['ODbL-1.0.txt', 'TERRAIN.md']) await cp(new URL(`../../LICENSES/${name}`, import.meta.url), new URL(`dist/${name}`, import.meta.url));
await cp(join(dirname(require.resolve('three')), '..', 'LICENSE'), new URL('dist/THREE-LICENSE.txt', import.meta.url));
