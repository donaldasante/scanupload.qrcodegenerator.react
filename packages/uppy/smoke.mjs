// Temporary smoke test: drives the built plugin with a real Uppy instance and a
// local HTTP server that stands in for the ScanUpload hub's file URLs.
import http from 'node:http';
import assert from 'node:assert/strict';
import Uppy from '@uppy/core';
import ScanUploadPlugin from './dist/index.es.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(predicate, label, timeoutMs = 3000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return;
    await sleep(10);
  }
  throw new Error(`Timed out waiting for: ${label}`);
}

let flakyRequests = 0;

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/flaky')) {
    flakyRequests += 1;
    // The hub announces a file over SignalR slightly before the blob is
    // readable, so the first GET legitimately 404s.
    if (flakyRequests === 1) {
      res.writeHead(404, { 'content-type': 'application/problem+json' });
      res.end(JSON.stringify({ title: 'FileUpload.FileNotFound' }));
      return;
    }
    res.writeHead(200, { 'content-type': 'image/jpeg' });
    res.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]));
    return;
  }
  if (req.url.startsWith('/photo')) {
    res.writeHead(200, { 'content-type': 'image/jpeg' });
    res.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]));
    return;
  }
  // Session bootstrap: fail fast and quietly.
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end('{}');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

const uppy = new Uppy({
  autoProceed: false,
  logger: { debug() {}, warn() {}, error() {} },
});

uppy.use(ScanUploadPlugin, { sessionUrl: `${base}/session`, clientId: 'smoke' });

const plugin = uppy.getPlugin('ScanUpload');
assert.ok(plugin instanceof ScanUploadPlugin, 'registered under id "ScanUpload"');
assert.ok(plugin.getCore(), 'exposes a core');

// Regression guard: @uppy/dashboard auto-mounts every plugin typed 'acquirer'
// or 'editor', which crashes a headless BasePlugin with "plugin.mount is not a
// function". The plugin type must stay out of that list.
assert.ok(
  !['acquirer', 'editor'].includes(plugin.type),
  `plugin.type must not be mountable by the Dashboard (got "${plugin.type}")`,
);

const core = plugin.getCore();
const file = (extra) => ({
  id: 'f1',
  name: 'photo.jpg',
  size: 5,
  type: 'image/jpeg',
  progress: 100,
  status: 'success',
  url: `${base}/photo.jpg`,
  ...extra,
});

// Simulate the hub's `FileAdded` push, exactly as the core's SignalR handler does.
core._setState({ sessionId: 'session-1', uploadedFiles: [file()] });
await until(() => plugin.getForwardedFiles().size === 1, 'file forwarded to Uppy');

const uppyFileId = plugin.getUppyFileId('f1');
const added = uppy.getFile(uppyFileId);
assert.equal(added.name, 'photo.jpg');
assert.equal(added.type, 'image/jpeg');
assert.equal(added.source, 'ScanUpload');
assert.equal(added.isRemote, false);
assert.equal(added.meta.scanUploadFileId, 'f1');
assert.equal(added.meta.scanUploadSessionId, 'session-1');
assert.equal(added.meta.scanUploadUrl, `${base}/photo.jpg`);
assert.equal(added.data.size, 5);
assert.equal(added.data.name, 'photo.jpg', 'downloaded blob is wrapped in a File');

// Repeat state notifications must not re-add the same hub file.
core._setState({ uploadedFiles: [file()] });
await sleep(80);
assert.equal(uppy.getFiles().length, 1, 'no duplicate add');

// A hub-side removal is mirrored into Uppy.
core._setState({ uploadedFiles: [] });
assert.equal(uppy.getFile(uppyFileId), undefined, 'removal mirrored');
assert.equal(plugin.getForwardedFiles().size, 0);

// A file whose URL has not been published yet is deferred …
core._setState({
  uploadedFiles: [
    { id: 'f2', name: 'late.png', size: 5, type: 'image/png', progress: 100, status: 'success' },
  ],
});
await sleep(80);
assert.equal(uppy.getFiles().length, 0, 'URL-less file is not forwarded');

// … and picked up on a later state change once the URL arrives.
core._setState({
  uploadedFiles: [
    { id: 'f2', name: 'late.png', size: 5, type: 'image/png', progress: 100, status: 'success', url: `${base}/photo.png` },
  ],
});
await until(() => plugin.getForwardedFiles().size === 1, 'deferred file forwarded once its URL arrives');
assert.ok(uppy.getFile(plugin.getUppyFileId('f2')));

// A file whose URL 404s on the first attempt must be retried, not reported as
// a terminal failure: the hub can announce a file before its blob is readable.
core._setState({
  uploadedFiles: [
    { id: 'f3', name: 'flaky.jpg', size: 5, type: 'image/jpeg', progress: 100, status: 'success', url: `${base}/flaky.jpg` },
  ],
});
await until(() => plugin.getUppyFileId('f3') !== undefined, 'file forwarded after retrying a 404');
assert.equal(flakyRequests, 2, 'first attempt 404ed, retry succeeded');
assert.ok(uppy.getFile(plugin.getUppyFileId('f3')), 'retried file is in Uppy');

// Teardown is safe and leaves Uppy usable.
uppy.destroy();
server.close();

console.log('smoke: OK');
