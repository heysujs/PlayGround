#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
BUILD_DIR="$PROJECT_DIR/dist"
METADATA_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
PORT="${PORT:-3000}"

run() {
  /usr/bin/time -p "$@"
}

cd "$PROJECT_DIR"
run mkdir -p "$BUILD_DIR" "$METADATA_DIR"
if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then
    run npm ci --no-audit --no-fund
  else
    run npm install --no-audit --no-fund
  fi
  if run node -e "const p=require('./package.json'); process.exit(p.scripts?.build ? 0 : 1)"; then
    run npm run build
  elif [[ ! -f index.html ]]; then
    echo 'package.json has no build script and no static index.html.' >&2
    exit 1
  fi
fi
if [[ ! -f "$BUILD_DIR/index.html" || index.html -nt "$BUILD_DIR/index.html" ]]; then
  if [[ ! -f index.html ]]; then
    echo 'Cannot build static output: index.html is missing.' >&2
    exit 1
  fi
  run install -m 0644 index.html "$BUILD_DIR/index.html"
fi
run node -e 'const fs=require("node:fs"); const p=process.argv[1]; const d=process.argv[2]; fs.writeFileSync(p, JSON.stringify({project:d, directory:d+"/dist"})+"\n")' "$METADATA_DIR/deployment-output.json" "$PROJECT_DIR"
if [[ ! "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1 || PORT > 65535 )); then
  echo "Invalid PORT: $PORT" >&2
  exit 1
fi
exec /usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$BUILD_DIR"
