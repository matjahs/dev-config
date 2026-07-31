#!/usr/bin/env node
import * as p from '@clack/prompts';
import { resolve } from 'node:path';
import { runInit, type ProjectType } from './init.js';

interface CliFlags {
  type?: ProjectType;
  cwd: string;
  force: boolean;
  yes: boolean;
}

function printHelp(): void {
  console.log(`Usage: matjahs-dev-config init [options]

Options:
  --type <next|node>   Project preset
  --cwd <path>         Target directory (default: .)
  --force              Overwrite existing files / scripts
  --yes, -y            Skip prompts when --type is set
  -h, --help           Show help
`);
}

function parseArgs(argv: string[]): { command?: string; flags: CliFlags } {
  const flags: CliFlags = {
    cwd: process.cwd(),
    force: false,
    yes: false,
  };
  let command: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (!arg.startsWith('-') && !command) {
      command = arg;
      continue;
    }

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--force') {
      flags.force = true;
      continue;
    }
    if (arg === '--yes' || arg === '-y') {
      flags.yes = true;
      continue;
    }
    if (arg === '--type') {
      const value = argv[++i];
      if (value !== 'next' && value !== 'node') {
        throw new Error(`Invalid --type: ${value ?? '(missing)'}`);
      }
      flags.type = value;
      continue;
    }
    if (arg === '--cwd') {
      const value = argv[++i];
      if (!value) throw new Error('--cwd requires a path');
      flags.cwd = resolve(value);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { command, flags };
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));

  if (command !== 'init') {
    printHelp();
    process.exit(command ? 1 : 0);
  }

  p.intro('@matjahs/dev-config');

  let type = flags.type;
  if (!type) {
    if (flags.yes) {
      throw new Error('--yes requires --type next|node');
    }

    const selected = await p.select({
      message: 'Which project type?',
      options: [
        { value: 'next' as const, label: 'Next.js / React' },
        { value: 'node' as const, label: 'Node / TypeScript (ESM)' },
      ],
    });

    if (p.isCancel(selected)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }

    type = selected;
  }

  await runInit({
    type,
    cwd: flags.cwd,
    force: flags.force,
  });

  p.outro('Done. Install the peer deps listed above, then run lint/format.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
