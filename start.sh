#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
export PORT OPENCODE_WEB_DIR

/usr/bin/time -p npm install --no-audit --no-fund
/usr/bin/time -p npm run build -- --base=./
/usr/bin/time -p node --input-type=module -e '
  import { mkdirSync, writeFileSync } from "node:fs";
  import { resolve } from "node:path";
  const project = process.cwd();
  const directory = resolve(project, "dist");
  mkdirSync(process.env.OPENCODE_WEB_DIR, { recursive: true });
  writeFileSync(
    resolve(process.env.OPENCODE_WEB_DIR, "deployment-output.json"),
    JSON.stringify({ project, directory })
  );
'

/usr/bin/time -p ./node_modules/.bin/vite preview --host 0.0.0.0 --port "$PORT" --strictPort
