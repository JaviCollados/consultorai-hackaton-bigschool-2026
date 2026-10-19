import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';

const root = process.cwd();
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png'};
const port = Number(process.env.PORT || 4173);

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    if (pathname !== '/index.html' && !pathname.startsWith('/src/') && !pathname.startsWith('/assets/')) {
      response.writeHead(404).end('No encontrado');
      return;
    }
    const target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const content = await readFile(target);
    response.writeHead(200, {'Content-Type': `${types[extname(target)] ?? 'application/octet-stream'}; charset=utf-8`});
    response.end(content);
  } catch {
    response.writeHead(404).end('No encontrado');
  }
}).listen(port, '127.0.0.1', () => console.log(`ConsultorAI: http://localhost:${port}`));
