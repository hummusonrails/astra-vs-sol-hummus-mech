import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.osm': 'application/xml' };
export function startServer(label, port = label === 'astra' ? 4322 : 4321) {
  if (!['astra', 'sol'].includes(label)) throw new Error('Unknown app.');
  const base = resolve(root, 'apps', label, 'dist');
  const server = http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let path = resolve(base, '.' + pathname);
      if (path !== base && !path.startsWith(base + sep)) { res.writeHead(403); return res.end(); }
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      const body = await readFile(path);
      res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`${label}: http://localhost:${port}`));
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) startServer(process.argv[2], process.argv[3] ? Number(process.argv[3]) : undefined);
