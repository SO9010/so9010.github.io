#!/bin/sh
# Keeps the served site in sync with GitHub. On start it clones the repo into
# the shared volume; then every UPDATE_INTERVAL seconds it fetches, hard-resets
# to the remote branch, and (when HEAD changed) regenerates blogs.json. On any
# git failure it logs and keeps serving the last-good content.
set -eu

REPO_URL="${REPO_URL:-https://github.com/SO9010/so9010.github.io.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
UPDATE_INTERVAL="${UPDATE_INTERVAL:-900}"
SITE_DIR="${SITE_DIR:-/site}"

log() { echo "[updater $(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }

# Trust any repo dir inside this isolated container (covers /site and a
# bind-mounted local source repo owned by a different host uid).
git config --global --add safe.directory '*'

generate() {
  if node /generate-blogs.js "$SITE_DIR" > "$SITE_DIR/blogs.json.tmp"; then
    mv "$SITE_DIR/blogs.json.tmp" "$SITE_DIR/blogs.json" # atomic swap
    log "regenerated blogs.json"
  else
    rm -f "$SITE_DIR/blogs.json.tmp"
    log "ERROR: blogs.json generation failed, keeping previous"
  fi
}

# Initial clone (volume may be empty on first run).
if [ ! -d "$SITE_DIR/.git" ]; then
  log "cloning $REPO_URL ($REPO_BRANCH) into $SITE_DIR"
  # Clone into a temp dir then move contents in, since the volume mountpoint exists.
  rm -rf /tmp/clone
  git clone --branch "$REPO_BRANCH" "$REPO_URL" /tmp/clone
  cp -a /tmp/clone/. "$SITE_DIR/"
  rm -rf /tmp/clone
  generate
fi

git config --global --add safe.directory "$SITE_DIR"

while true; do
  before="$(git -C "$SITE_DIR" rev-parse HEAD 2>/dev/null || echo none)"
  if git -C "$SITE_DIR" fetch --quiet origin "$REPO_BRANCH" \
     && git -C "$SITE_DIR" reset --hard --quiet "origin/$REPO_BRANCH"; then
    after="$(git -C "$SITE_DIR" rev-parse HEAD)"
    if [ "$before" != "$after" ] || [ ! -f "$SITE_DIR/blogs.json" ]; then
      log "HEAD $before -> $after; regenerating"
      generate
    fi
  else
    log "WARN: git fetch/reset failed; serving last-good content"
  fi
  sleep "$UPDATE_INTERVAL"
done
