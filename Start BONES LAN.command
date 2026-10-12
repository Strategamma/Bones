#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo 'Node.js is required. Install it, then open this file again.'
  read -r '?Press Return to close.'
  exit 1
fi
export npm_config_cache="${TMPDIR:-/tmp}/bones-npm-cache"
if [ ! -d node_modules ]; then npm ci || exit 1; fi
npm run lan
