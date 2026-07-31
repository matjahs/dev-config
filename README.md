# @matjahs/dev-config

Scaffold personal ESLint, Prettier, TypeScript, and EditorConfig into new projects.

Requires **Node 20+**, **ESM** (`"type": "module"`), and **TypeScript 6+**.

## Quick start

```bash
npx @matjahs/dev-config init
# or non-interactive:
npx @matjahs/dev-config init --type node --yes
npx @matjahs/dev-config init --type next --cwd ./web --force
```

## What it writes

### Shared

- `.prettierrc.json`
- `.prettierignore`
- `.editorconfig`

### `--type next`

- `eslint.config.mjs` (eslint-config-next + prettier)
- `tsconfig.json` (Next App Router / bundler)

### `--type node`

- `eslint.config.mjs` (typescript-eslint + node globals + prettier)
- `tsconfig.json` (NodeNext ESM, TS 6)

If `package.json` exists, it also:

- sets `"type": "module"`
- merges scripts (skips existing unless `--force`):

```json
{
  "lint": "eslint .",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit"
}
```

Existing files are skipped unless you pass `--force`.

## Peer dependencies

Install after scaffolding (the CLI prints the exact command):

**node**

```bash
npm install -D @eslint/js eslint@^9 eslint-config-prettier globals prettier@^3 typescript@^6 typescript-eslint @types/node
```

**next**

```bash
npm install -D eslint@^9 eslint-config-next eslint-config-prettier prettier@^3 typescript@^6
```

## CLI options

| Flag | Description |
|------|-------------|
| `--type next\|node` | Preset (prompts if omitted) |
| `--cwd <path>` | Target directory (default: `.`) |
| `--force` | Overwrite existing files and scripts |
| `--yes` / `-y` | Non-interactive (requires `--type`) |

## Local development

```bash
npm install
npm run build
node dist/cli.js init --type node --cwd /tmp/demo --force
```

## License

MIT
