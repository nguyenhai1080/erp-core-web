import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDirectory = fileURLToPath(new URL('./public/', import.meta.url));
const apiBase = new URL(process.env.API_BASE_URL || 'https://erp-core-web-staging.n1.tinhgon.xyz');
if (!['https:', 'http:'].includes(apiBase.protocol) || apiBase.username || apiBase.password) {
  throw new Error('API_BASE_URL must be an HTTP(S) URL without credentials');
}
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8'
};
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end(); return; }
  if (pathname === '/api/v1/health') {
    try {
      const upstream = await fetch(new URL('/api/v1/health', apiBase), {
        signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' }
      });
      const result = await upstream.json();
      if (!upstream.ok || result.status !== 'ok' || result.service !== 'erp-core-api' || result.database !== 'connected') {
        throw new Error('API health failed');
      }
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ status: 'ok', service: 'erp-core-api', database: 'connected' }));
    } catch {
      response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ status: 'error', service: 'erp-core-web', database: 'unavailable' }));
    }
    return;
  }
  if (pathname.startsWith('/api/')) { response.writeHead(404); response.end(); return; }
  const root = resolve(publicDirectory);
  let filename = resolve(root, '.' + pathname);
  if (filename !== root && !filename.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
  if (filename === root) filename = resolve(root, 'index.html');
  try {
    let body;
    try { body = await readFile(filename); }
    catch (error) {
      if (error.code !== 'ENOENT' || extname(pathname)) throw error;
      filename = resolve(root, 'index.html'); body = await readFile(filename);
    }
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filename)] || 'application/octet-stream',
      'Cache-Control': filename.includes(sep + 'assets' + sep) ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => {
  console.log('ERP Core Web listening on port ' + (process.env.PORT || 3000));
});
