# Self-hosting this site with Docker

The site runs as a small two-container stack and **auto-updates from GitHub** —
once it's running, the only thing you do to publish a new blog post or a code
change is `git push`.

## How it works

- **`updater`** (`node:alpine` + `git`) clones this public repo into a shared
  Docker volume, then every `UPDATE_INTERVAL` seconds runs
  `git fetch` + `git reset --hard origin/main`. When the commit changes it
  regenerates `blogs.json` from the markdown in `blogs/` (and `blog/`) via
  [`updater/generate-blogs.js`](updater/generate-blogs.js), writing it
  atomically so the web server never sees a half-written file.
- **`web`** (`nginx:alpine`) serves that shared volume on host port **8082**.
  It waits for the updater's first successful run, so it never serves an empty
  page.
- The page ([`life.js`](life.js)) fetches `./blogs.json` and renders it. The
  markdown files are the single source of truth — there is no hardcoded blog
  list in the code. (The `web` service waits for the updater's first generation,
  so `blogs.json` is always present before the page is served.)

Posts are ordered newest-first by the date each markdown file was first added
to git. Titles come from each file's first `# H1`. Deep links use a stable
per-post slug (`#blog-<slug>`), so sharing a link keeps working even after
newer posts push it down the list.

## Run it

```sh
docker compose up -d --build
docker compose ps          # updater becomes "healthy", then web starts
docker compose logs -f updater
```

Then open `http://<this-machine-ip>:8082`.

To stop / update the infra:

```sh
docker compose down                # stop
docker compose up -d --build       # rebuild after editing infra files
```

> Note: the running site serves the updater's clone of **GitHub**, not your
> local working copy. Content and `life.js` changes go live after you
> `git push` (within one `UPDATE_INTERVAL`). Changes to the Docker/nginx infra
> files take effect on `docker compose up -d --build`.

## Configuration

Edit [`docker-compose.yml`](docker-compose.yml):

- **Port** — change `ports: ["8082:80"]` (host side) on the `web` service.
- **Update frequency** — `UPDATE_INTERVAL` (seconds; default `900` = 15 min).
- **Source** — `REPO_URL` / `REPO_BRANCH` on the `updater` service.

## Optional: HTTPS at a domain via Caddy

Port 80 is currently used directly by another container, so this stack just
publishes `8082`. To put it on a domain with automatic HTTPS later, run Caddy
as a reverse proxy and add a block like:

```caddy
blog.oldham.fyi {
    reverse_proxy <this-machine-ip>:8082
    encode gzip
}
```

(Or, if `web` joins the same Docker network as Caddy, `reverse_proxy blog-web:80`
and drop the published port.) Add a DNS record for the subdomain pointing at
your public IP.
