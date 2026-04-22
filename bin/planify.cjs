#!/usr/bin/env node

const { spawn } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cliEntry = path.resolve(__dirname, '..', 'src', 'cli', 'main.mts');
const packageRoot = path.resolve(__dirname, '..');

function resolveLocalModule(specifier) {
  return require.resolve(specifier, {
    paths: [packageRoot],
  });
}

const tsxLoader = pathToFileURL(resolveLocalModule('tsx')).href;

const child = spawn(
  process.execPath,
  ['--import', tsxLoader, cliEntry, ...process.argv.slice(2)],
  {
    cwd: packageRoot,
    stdio: 'inherit',
    env: process.env,
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  process.stderr.write(`Failed to start Planify CLI: ${error.message}\n`);
  process.exit(1);
});
