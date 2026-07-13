import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../server.js';
import { VENUE_NODES, VENUE_EDGES } from '../data.js';
import { findShortestPath } from '../map.js';

function request(server, pathName) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path: pathName,
        method: 'GET'
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

test('server serves the homepage, styles, scripts, handles 404, and blocks path traversal', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // 1. Verify Home Page
    const homeResponse = await request(server, '/');
    assert.equal(homeResponse.statusCode, 200);
    assert.match(homeResponse.headers['content-type'] || '', /text\/html/);
    assert.equal(homeResponse.headers['permissions-policy'], 'unload=*');
    assert.match(homeResponse.body, /METLIFE LIVE/);

    // 2. Verify Stylesheet MIME Type and Header
    const cssResponse = await request(server, '/style.css');
    assert.equal(cssResponse.statusCode, 200);
    assert.match(cssResponse.headers['content-type'] || '', /text\/css/);
    assert.equal(cssResponse.headers['permissions-policy'], 'unload=*');

    // 3. Verify App Script MIME Type and Header
    const jsResponse = await request(server, '/app.js');
    assert.equal(jsResponse.statusCode, 200);
    assert.match(jsResponse.headers['content-type'] || '', /application\/javascript/);
    assert.equal(jsResponse.headers['permissions-policy'], 'unload=*');

    // 4. Verify 404 Not Found
    const missingResponse = await request(server, '/non-existent-file.html');
    assert.equal(missingResponse.statusCode, 404);

    // 5. Verify Block Path Traversal
    const traversalResponse = await request(server, '/..%2Fpackage.json');
    assert.equal(traversalResponse.statusCode, 403);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test('findShortestPath returns a valid path between two known nodes', () => {
  const path = findShortestPath(VENUE_NODES, VENUE_EDGES, 'gate_1', 'sector_104');

  assert.equal(path[0], 'gate_1');
  assert.equal(path[path.length - 1], 'sector_104');
  assert.ok(path.length >= 2);
  assert.ok(path.every((nodeId) => VENUE_NODES[nodeId]));
});
