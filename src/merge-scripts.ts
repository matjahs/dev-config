export const SCRIPT_DEFAULTS: Record<string, string> = {
  lint: 'eslint .',
  format: 'prettier --write .',
  'format:check': 'prettier --check .',
  typecheck: 'tsc --noEmit',
};

export interface MergeScriptsResult {
  scripts: Record<string, string>;
  added: string[];
  updated: string[];
  skipped: string[];
}

export function mergeScripts(
  existing: Record<string, string>,
  defaults: Record<string, string>,
  force: boolean
): MergeScriptsResult {
  const scripts = { ...existing };
  const added: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  for (const [name, command] of Object.entries(defaults)) {
    if (!(name in scripts)) {
      scripts[name] = command;
      added.push(name);
      continue;
    }

    if (force && scripts[name] !== command) {
      scripts[name] = command;
      updated.push(name);
      continue;
    }

    skipped.push(name);
  }

  return { scripts, added, updated, skipped };
}
