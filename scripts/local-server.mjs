import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = path.join(root, '.runtime');
fs.mkdirSync(runtime, { recursive: true });
const statePath = path.join(runtime, 'server.json');
const action = process.argv[2] || 'start';
async function request(state, method) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5177,
        path: '/control',
        method,
        headers: { 'X-DataForge-Control': state.token },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () =>
          res.statusCode === 200
            ? resolve(JSON.parse(body))
            : reject(new Error('Control request rejected')),
        );
      },
    );
    req.on('error', reject);
    req.setTimeout(4000, () => req.destroy(new Error('Control timed out')));
    req.end();
  });
}
if (action === 'stop') {
  if (!fs.existsSync(statePath)) {
    console.log('DataForge is already stopped.');
    process.exit(0);
  }
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  if (state.root !== root) throw new Error('Launcher root mismatch');
  try {
    await request(state, 'DELETE');
    console.log('Stopped this DataForge instance.');
  } catch {
    throw new Error('No authenticated launcher responded; no unrelated processes were stopped.');
  }
  process.exit(0);
}
if (fs.existsSync(statePath)) {
  const old = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  try {
    const response = await request(old, 'GET');
    if (response.root === root) {
      console.log('DataForge is already running.');
      process.exit(0);
    }
  } catch {}
  fs.unlinkSync(statePath);
}
for (const port of [8004, 5176]) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () =>
      reject(new Error('Port ' + port + ' is occupied. Stop the other DataForge instance first.')),
    );
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}
const token = crypto.randomBytes(32).toString('hex');
const children = [];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      if (process.platform === 'win32')
        execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        });
      else child.kill('SIGTERM');
    } catch {}
  }
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  control.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
const control = http.createServer((req, res) => {
  if (req.url !== '/control' || req.headers['x-dataforge-control'] !== token) {
    res.writeHead(403).end();
    return;
  }
  res
    .writeHead(200, { 'Content-Type': 'application/json' })
    .end(JSON.stringify({ root, pid: process.pid }));
  if (req.method === 'DELETE') setTimeout(stop, 100);
});
await new Promise((resolve, reject) => {
  control.once('error', reject);
  control.listen(5177, '127.0.0.1', resolve);
});
const python = path.join(
  root,
  '.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);
if (!fs.existsSync(python))
  throw new Error('Run Start-DataForge.ps1 to install Python dependencies first.');
const env = {
  ...process.env,
  ENVIRONMENT: 'development',
  APP_ORIGIN: 'http://127.0.0.1:5176',
  SERVE_WEB: 'false',
};
function launch(name, command, args) {
  const log = fs.openSync(path.join(runtime, name + '.log'), 'a');
  const child = spawn(command, args, {
    cwd: root,
    env,
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  children.push(child);
  child.on('error', stop);
  child.on('exit', () => {
    if (!stopping) stop();
  });
}
launch('api', python, [
  '-m',
  'uvicorn',
  'app.main:app',
  '--app-dir',
  'backend',
  '--host',
  '127.0.0.1',
  '--port',
  '8004',
  '--workers',
  '1',
  '--limit-concurrency',
  '20',
  '--no-access-log',
]);
launch('web', process.execPath, [
  'node_modules/vite/bin/vite.js',
  '--host',
  '127.0.0.1',
  '--port',
  '5176',
  '--strictPort',
]);
fs.writeFileSync(statePath, JSON.stringify({ root, pid: process.pid, token }));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
console.log('DataForge launcher listening.');
