import { access, copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import { mergeScripts, SCRIPT_DEFAULTS } from './merge-scripts.js';

export type ProjectType = 'next' | 'node';

export interface InitOptions {
  type: ProjectType;
  cwd: string;
  force: boolean;
}

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES_ROOT = join(PACKAGE_ROOT, 'templates');

const PEER_DEPS: Record<ProjectType, string[]> = {
  next: [
    'eslint@^9',
    'eslint-config-next',
    'eslint-config-prettier',
    'prettier@^3',
    'typescript@^6',
  ],
  node: [
    '@eslint/js',
    'eslint@^9',
    'eslint-config-prettier',
    'globals',
    'prettier@^3',
    'typescript@^6',
    'typescript-eslint',
    '@types/node',
  ],
};

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function copyTemplateFile(
  source: string,
  destination: string,
  force: boolean
): Promise<'written' | 'skipped'> {
  if (!force && (await pathExists(destination))) {
    return 'skipped';
  }

  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  return 'written';
}

async function copyDirectoryFiles(
  sourceDir: string,
  targetDir: string,
  force: boolean
): Promise<{ written: string[]; skipped: string[] }> {
  const written: string[] = [];
  const skipped: string[] = [];
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const source = join(sourceDir, entry.name);
    const destination = join(targetDir, entry.name);
    const result = await copyTemplateFile(source, destination, force);

    if (result === 'written') written.push(entry.name);
    else skipped.push(entry.name);
  }

  return { written, skipped };
}

function printPeerDeps(type: ProjectType): void {
  const deps = PEER_DEPS[type].join(' ');
  p.note(`npm install -D ${deps}`, 'Install peer dependencies');
}

export async function runInit(options: InitOptions): Promise<void> {
  const { type, cwd, force } = options;
  const sharedDir = join(TEMPLATES_ROOT, 'shared');
  const presetDir = join(TEMPLATES_ROOT, type);

  const spinner = p.spinner();
  spinner.start(`Scaffolding ${type} config into ${cwd}`);

  const shared = await copyDirectoryFiles(sharedDir, cwd, force);
  const preset = await copyDirectoryFiles(presetDir, cwd, force);

  const packageJsonPath = join(cwd, 'package.json');
  let scriptsMerged = false;
  let scriptsSkipped: string[] = [];

  if (await pathExists(packageJsonPath)) {
    const raw = await readFile(packageJsonPath, 'utf8');
    const pkg = JSON.parse(raw) as {
      type?: string;
      scripts?: Record<string, string>;
    };

    if (pkg.type !== 'module') {
      pkg.type = 'module';
    }

    const merge = mergeScripts(pkg.scripts ?? {}, SCRIPT_DEFAULTS, force);
    pkg.scripts = merge.scripts;
    scriptsMerged = merge.added.length > 0 || merge.updated.length > 0;
    scriptsSkipped = merge.skipped;

    await writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  }

  spinner.stop('Scaffold complete');

  const written = [...shared.written, ...preset.written];
  const skipped = [...shared.skipped, ...preset.skipped];

  if (written.length > 0) {
    p.log.success(`Wrote: ${written.join(', ')}`);
  }
  if (skipped.length > 0) {
    p.log.warn(`Skipped existing (use --force): ${skipped.join(', ')}`);
  }
  if (!(await pathExists(packageJsonPath))) {
    p.log.warn('No package.json found — skipped script merge and type=module.');
  } else if (scriptsMerged) {
    p.log.success('Updated package.json (type=module + scripts)');
  } else if (scriptsSkipped.length > 0) {
    p.log.info(`Scripts already present: ${scriptsSkipped.join(', ')}`);
  }

  printPeerDeps(type);
}
