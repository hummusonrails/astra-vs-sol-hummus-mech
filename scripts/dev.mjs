import { spawnSync } from 'node:child_process';
import { startServer } from './server.mjs';
const label = process.argv[2];
if (!['astra', 'sol'].includes(label)) throw new Error('Choose astra or sol.');
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', `build:${label}`], { cwd: new URL('..', import.meta.url), stdio: 'inherit', shell: process.platform === 'win32' });
if (result.status !== 0) process.exit(result.status ?? 1);
startServer(label);
