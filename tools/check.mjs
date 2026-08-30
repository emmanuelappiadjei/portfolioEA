/**
 * Static integrity check: internal links, local asset paths, duplicate ids,
 * missing alt text, and stray absolute paths that would break on GitHub Pages
 * (where the site is served from /<repo>/ rather than the domain root).
 *
 *   npm run check
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const problems = [];
const note = (file, msg) => problems.push(`${file}: ${msg}`);

const isExternal = (u) => /^(https?:|mailto:|tel:|data:|javascript:|#|\{\{)/.test(u);

for (const file of files) {
  const html = readFileSync(join(ROOT, file), 'utf8');

  // Every href/src that points at something in this repository must resolve.
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (isExternal(ref)) continue;
    if (ref.startsWith('/')) { note(file, `absolute path breaks on GitHub Pages: ${ref}`); continue; }
    const path = normalize(join(ROOT, ref.split('#')[0].split('?')[0]));
    if (!existsSync(path)) note(file, `missing target: ${ref}`);
  }

  // srcset entries too.
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (!url || isExternal(url)) continue;
      if (!existsSync(join(ROOT, url))) note(file, `missing srcset target: ${url}`);
    }
  }

  // In-page anchors must exist.
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    if (!new RegExp(`id="${m[1]}"`).test(html)) note(file, `dangling anchor: #${m[1]}`);
  }

  // Duplicate ids.
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) note(file, `duplicate id(s): ${[...new Set(dupes)].join(', ')}`);

  // Images need alt text (empty alt is fine — that marks a decorative image).
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt=/.test(m[0])) note(file, `img without alt: ${m[0].slice(0, 90)}`);
  }

  // Exactly one h1 per page.
  const h1s = (html.match(/<h1\b/g) || []).length;
  if (html.includes('build:header') && h1s !== 1) note(file, `expected 1 <h1>, found ${h1s}`);

  // Leftover placeholder contact details from the previous build.
  if (html.includes('youremail@example.com')) note(file, 'placeholder email address');
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`✓ ${files.length} pages checked — links, assets, anchors, ids, and alt text all resolve.`);
