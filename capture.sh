#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$PROJECT_DIR"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the evidence output directory}"

capture_dir="$(mkdir -p "$CAPTURE_DIR" && cd "$CAPTURE_DIR" && pwd -P)"
case "$capture_dir/" in
  "$PROJECT_DIR/"*)
    echo "CAPTURE_DIR must be outside the project source tree." >&2
    exit 1
    ;;
esac

export CAPTURE_STRICT=1
export CAPTURE_READY_SELECTOR="${CAPTURE_READY_SELECTOR:-#game}"
/usr/bin/time -p node "${RUNTIME_DIR:?}/scripts/default-capture.mjs"
