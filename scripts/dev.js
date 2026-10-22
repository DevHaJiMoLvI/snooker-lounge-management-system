import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmExec = process.platform === 'win32' ? 'node_modules/vite/bin/vite.js' : 'node_modules/vite/bin/vite.js';
const children = [
  spawn(process.execPath, ['server/index.js'], { cwd: root, stdio: 'inherit', env: process.env }),
  spawn(process.execPath, [npmExec], { cwd: root, stdio: 'inherit', env: process.env })
];
let stopping = false;
const stop = code => {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill();
  process.exitCode = code;
};
for (const child of children) {
  child.on('error', error => { console.error(error); stop(1); });
  child.on('exit', code => { if (!stopping && code !== 0) stop(code || 1); });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(0));
