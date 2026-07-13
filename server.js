import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export function createServer() {
  return http.createServer((req, res) => {
    let requestedPath = req.url ? req.url.split('?')[0] : '/';
    requestedPath = requestedPath === '/' ? '/index.html' : requestedPath;

    const safeRoot = path.resolve(__dirname);
    const requestedFilePath = path.resolve(__dirname, `.${requestedPath}`);
    const relativePath = path.relative(safeRoot, requestedFilePath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Access Denied');
      return;
    }

    fs.readFile(requestedFilePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.end('404 Not Found');
        } else {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(`Internal Server Error: ${err.code}`);
        }
      } else {
        const ext = path.extname(requestedFilePath).toLowerCase();
        res.statusCode = 200;
        res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
        res.setHeader('Permissions-Policy', 'unload=*');
        res.end(content);
      }
    });
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}
