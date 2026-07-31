#!/usr/bin/env node
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const cli = join(root, 'dist/cli.js');

const SHARED_FILES = [
  '.prettierrc.json',
  '.prettierignore',
  '.editorconfig',
  'eslint.config.mjs',
  'tsconfig.json',
];

const NODE_PEERS = [
  '@eslint/js@^9',
  'eslint@^9',
  'eslint-config-prettier',
  'globals',
  'prettier@^3',
  'typescript@^6',
  'typescript-eslint',
  '@types/node',
];

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 */
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

/**
 * @param {string} path
 */
async function assertExists(path) {
  try {
    await access(path);
  } catch {
    throw new Error(`expected file to exist: ${path}`);
  }
}

/**
 * @param {'next' | 'node'} type
 */
async function smokePreset(type) {
  const dir = await mkdtemp(join(tmpdir(), `dev-config-${type}-`));
  console.log(`\n==> smoke ${type} in ${dir}`);

  await writeFile(
    join(dir, 'package.json'),
    `${JSON.stringify({ name: `smoke-${type}`, version: '0.0.0' }, null, 2)}\n`
  );

  await run('node', [cli, 'init', '--type', type, '--cwd', dir, '--force', '--yes']);

  for (const file of SHARED_FILES) {
    await assertExists(join(dir, file));
  }

  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
  if (pkg.type !== 'module') {
    throw new Error(`${type}: expected package.json type=module`);
  }
  for (const script of ['lint', 'format', 'format:check', 'typecheck']) {
    if (!pkg.scripts?.[script]) {
      throw new Error(`${type}: missing script ${script}`);
    }
  }

  // Second init without --force must succeed (skip existing files).
  await run('node', [cli, 'init', '--type', type, '--cwd', dir, '--yes']);

  if (type === 'node') {
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(
      join(dir, 'src/index.ts'),
      'export function greet(name: string): string {\n  return `hello ${name}`;\n}\n'
    );
    await run('npm', ['install', '-D', ...NODE_PEERS], { cwd: dir });
    await run('npm', ['run', 'typecheck'], { cwd: dir });
    await run('npm', ['run', 'lint'], { cwd: dir });
    await run('npm', ['run', 'format:check'], { cwd: dir });
  }

  console.log(`==> smoke ${type} passed`);
}

async function main() {
  await assertExists(cli);
  await smokePreset('node');
  await smokePreset('next');
  console.log('\nAll smoke tests passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
