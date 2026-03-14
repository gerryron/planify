import { spawn } from 'node:child_process';

function runScript(name, prefixColor, prefix) {
  const child = spawn(`npm run ${name}`, {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });

  child.on('error', (error) => {
    process.stderr.write(`[${prefix}] failed to start: ${error.message}\n`);
    shutdown(1);
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`${prefixColor}[${prefix}]\x1b[0m ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`${prefixColor}[${prefix}]\x1b[0m ${chunk}`);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.stdout.write(`[${prefix}] exited by signal ${signal}\n`);
      return;
    }

    if (code !== 0) {
      process.stderr.write(`[${prefix}] exited with code ${code}\n`);
      shutdown(code ?? 1);
    }
  });

  return child;
}

const children = [
  runScript('dev:next', '\x1b[36m', 'next'),
  runScript('dev:swagger', '\x1b[35m', 'swagger'),
];

let stopping = false;

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
    process.exit(code);
  }, 1200);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
