#!/usr/bin/env node
// Scans the blog markdown directories and prints a newest-first blogs.json to
// stdout. Zero dependencies (Node stdlib only) so it runs in node:alpine with
// no `npm install`. JSON.stringify handles all markdown escaping safely.
//
// Usage: node generate-blogs.js [repo-root]   (default: /site)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.argv[2] || '/site';
const BLOG_DIRS = ['blogs', 'blog']; // scanned in order; first wins on slug clash
const EXCLUDE = new Set(['readme.md', 'license.md']);

// First non-blank line as an H1, e.g. "# Hello world" -> "Hello world".
function extractH1(content) {
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (line === '') continue;
    const m = line.match(/^#\s+(.+)$/);
    return m ? m[1].trim() : null; // first content line decides; non-H1 => not a blog
  }
  return null;
}

// Leading "#3-" (or "#3 ") in a filename gives the legacy order number.
function fileNumber(basename) {
  const m = basename.match(/^#(\d+)[-\s]/);
  return m ? parseInt(m[1], 10) : null;
}

// Stable identity for deep links: strip a leading "#N-"/"#" and ".md",
// lowercase, hyphenate. e.g. "#4-hello-bad-news.md" -> "hello-bad-news".
function makeSlug(basename) {
  return basename
    .replace(/\.md$/i, '')
    .replace(/^#\d+[-\s]*/, '')
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Title from the H1, dropping a leading bare order-number that duplicates the
// filename's "#N" (e.g. "1 My Home Lab Journey" -> "My Home Lab Journey").
function makeTitle(h1, num, basename) {
  if (h1) {
    let t = h1;
    if (num != null) {
      const m = t.match(/^(\d+)\s+(.+)$/);
      if (m && parseInt(m[1], 10) === num) t = m[2];
    }
    return t.trim();
  }
  // Fallback: derive from filename.
  return basename
    .replace(/\.md$/i, '')
    .replace(/^#\d+[-\s]*/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

// ISO date of the commit that first added the file (oldest "A" entry, so the
// last line of --follow output). Null if not in git / uncommitted.
function gitAddedDate(relpath) {
  try {
    const out = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--follow', '--format=%aI', '--', relpath],
      { cwd: ROOT, encoding: 'utf8' }
    );
    const lines = out.split('\n').map(s => s.trim()).filter(Boolean);
    return lines.length ? lines[lines.length - 1] : null;
  } catch {
    return null;
  }
}

const posts = [];
const seen = new Set();

for (const dir of BLOG_DIRS) {
  const abs = path.join(ROOT, dir);
  let entries;
  try {
    entries = fs.readdirSync(abs);
  } catch {
    continue; // directory may not exist
  }

  for (const name of entries) {
    if (name.startsWith('.')) continue;
    if (!name.toLowerCase().endsWith('.md')) continue;
    if (EXCLUDE.has(name.toLowerCase())) continue;

    const full = path.join(abs, name);
    if (!fs.statSync(full).isFile()) continue;

    const content = fs.readFileSync(full, 'utf8');
    const h1 = extractH1(content);
    if (!h1) continue; // first content line isn't an H1 => not a blog post

    const slug = makeSlug(name);
    if (seen.has(slug)) {
      console.error(`generate-blogs: duplicate slug "${slug}" (${dir}/${name}) skipped`);
      continue;
    }
    seen.add(slug);

    const num = fileNumber(name);
    posts.push({
      filename: name,
      title: makeTitle(h1, num, name),
      slug,
      content,
      date: gitAddedDate(path.join(dir, name)),
      _ts: null, // filled below
      _n: num,
    });
  }
}

// Newest first: by added date desc, then legacy #N desc, then filename desc.
for (const p of posts) p._ts = p.date ? Date.parse(p.date) : Infinity; // uncommitted => newest
posts.sort((a, b) => {
  if (a._ts !== b._ts) return b._ts - a._ts;
  const na = a._n == null ? -Infinity : a._n;
  const nb = b._n == null ? -Infinity : b._n;
  if (na !== nb) return nb - na;
  return a.filename < b.filename ? 1 : a.filename > b.filename ? -1 : 0;
});

const out = posts.map(({ filename, title, slug, content, date }) => ({
  filename,
  title,
  slug,
  content,
  date,
}));

process.stdout.write(JSON.stringify(out, null, 2) + '\n');
console.error(`generate-blogs: wrote ${out.length} posts (${out.map(p => p.slug).join(', ')})`);
