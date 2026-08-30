/**
 * Static partial builder.
 *
 * Every page keeps real HTML in the file (no client-side templating, so the
 * site works without JS and reads correctly to crawlers). This script is what
 * keeps that HTML consistent: it renders the header, mobile menu, contact
 * footer and the project/landing/email indexes from assets/data/site.json and
 * writes them into the marked regions of each page.
 *
 *   <!-- build:header --> … <!-- /build:header -->
 *
 * Run `npm run build` after editing site.json or any partial, then commit the
 * regenerated HTML.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(ROOT, 'assets/data/site.json'), 'utf8'));
const { meta, nav, projects, landing, emails, disciplines, marquee } = data;

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* ---------------------------------------------------------------- partials */

function header(active) {
  // The label is duplicated into data-label so the link can roll vertically
  // on hover without a second element in the markup.
  const links = nav.filter((n) => n.desktop).map((n) => {
    const current = n.id === active ? ' aria-current="page"' : '';
    return `        <a class="nav__link" href="${n.href}"${current}><span data-label="${esc(n.label)}">${esc(n.label)}</span></a>`;
  }).join('\n');

  return `  <header class="site-header">
    <div class="site-header__bar">
      <a class="brand" href="index.html" aria-label="${esc(meta.name)} — home">EA<sup>&reg;</sup></a>
      <nav class="nav" aria-label="Primary">
${links}
      </nav>
      <a class="header__cta" href="contact.html">Let&rsquo;s connect <span class="arrow" aria-hidden="true">&#8599;</span></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">
        <span class="menu-toggle__lines" aria-hidden="true"></span>
      </button>
    </div>
  </header>`;
}

function mobileMenu(active) {
  const links = nav.map((n, i) => {
    const current = n.id === active ? ' aria-current="page"' : '';
    return `    <a class="mobile-menu__link" href="${n.href}"${current}>${esc(n.label)} <span class="label">${String(i + 1).padStart(2, '0')}</span></a>`;
  }).join('\n');

  return `  <div class="mobile-menu" id="mobile-menu">
${links}
    <div class="mobile-menu__foot">
      <a class="label label--dot" href="mailto:${meta.email}">${esc(meta.email)}</a>
      <span class="label">${esc(meta.location)}</span>
    </div>
  </div>`;
}

function contact() {
  return `  <section class="contact-block section" id="contact">
    <span class="contact-block__glow" aria-hidden="true"></span>
    <div class="shell contact-block__inner">
      <div class="section-head" style="border-top:0;padding-top:0">
        <div class="section-head__meta section-marker">
          <span class="section-marker__word">Contact</span>
          <span class="label">${esc(meta.location)}</span>
        </div>
      </div>
      <p class="lede contact-block__prompt" data-reveal>${esc(meta.contactPrompt)}</p>
      <a class="contact-mail" href="mailto:${meta.email}" data-reveal>Let&rsquo;s<br>connect</a>
      <span class="contact-monogram" aria-hidden="true">${esc(meta.shortName)}<sup>&reg;</sup></span>
      <div class="site-foot__row" data-reveal>
        <a class="link-action" href="mailto:${meta.email}">${esc(meta.email)} <span class="arrow" aria-hidden="true">&#8599;</span></a>
        <a class="link-action" href="contact.html">Contact page <span class="arrow" aria-hidden="true">&#8599;</span></a>
      </div>
    </div>
  </section>

  <footer class="site-foot">
    <div class="shell">
      <div class="site-foot__row">
        <span class="label">&copy; <span data-year>2026</span> ${esc(meta.name)}</span>
        <div class="site-foot__links">
${nav.map((n) => `          <a class="label" href="${n.href}">${esc(n.label)}</a>`).join('\n')}
        </div>
        <span class="label">${esc(meta.descriptor)}</span>
      </div>
    </div>
  </footer>`;
}

/* ------------------------------------------------------------- work index */
/* Each project is an editorial block: large media on one side, type on the
   other, alternating, with the title stepping over the edge of the image.
   No cards, no boxes — a rule between pieces and a lot of air. */

function workPieces({ limit = projects.length } = {}) {
  return projects.slice(0, limit).map((p, i) => {
    const flip = i % 2 === 1 ? ' work-piece--flip' : '';
    return `      <a class="work-piece${flip}" href="${p.href}">
        <span class="work-piece__media" data-mask-media>
          <img src="${p.image}" alt="${esc(p.imageAlt)}" width="${p.width}" height="${p.height}"
               loading="lazy" decoding="async" data-parallax="3" data-parallax-scale="1.08">
        </span>
        <span class="work-piece__body">
          <span class="work-piece__no">${esc(p.no)}</span>
          <span class="work-piece__title">${esc(p.title)}</span>
          <span class="work-piece__meta">
            <span class="label">${esc(p.client)}</span>
            <span class="label">${esc(p.category)}</span>
            <span class="label">${esc(p.year)}</span>
          </span>
          <span class="work-piece__role">${esc(p.role)}</span>
          <span class="work-piece__result">
            <b>${esc(p.result)}</b>
            <i>${esc(p.resultNote)}</i>
          </span>
          <span class="work-piece__cta">View case study <span class="arrow" aria-hidden="true">&#8599;</span></span>
        </span>
      </a>`;
  }).join('\n');
}

function workIndex(opts) {
  return `    <div class="work-index">
${workPieces(opts)}
    </div>`;
}

/* ------------------------------------------------------- landing archive */

function landingItems({ limit = landing.length } = {}) {
  return landing.slice(0, limit).map((l, i) => {
    const flip = i % 2 === 1 ? ' archive-item--flip' : '';
    const extra = l.extra
      ? `\n          <a class="link-action" href="${l.extra.url}">${esc(l.extra.label)} <span class="arrow" aria-hidden="true">&#8599;</span></a>`
      : '';
    return `      <article class="archive-item${flip}" data-reveal>
        <div class="archive-item__frame">
          <div class="archive-item__chrome" aria-hidden="true"><i></i><i></i><i></i><em>${esc(l.url)}</em></div>
          <a class="archive-item__shot" href="${l.url}" aria-label="Open the ${esc(l.title)} landing page">
            <img src="${l.shot}" alt="${esc(l.shotAlt)}" width="${l.width}" height="${l.height}" loading="lazy" decoding="async">
          </a>
        </div>
        <div class="archive-item__body">
          <div class="section-head__meta" style="border:0">
            <span class="label label--dot">${esc(l.no)} / ${esc(l.category)}</span>
            <span class="label">${esc(l.platform)}</span>
          </div>
          <h3 class="archive-item__title">${esc(l.title)}</h3>
          <span class="label archive-item__client">${esc(l.client)}</span>
          <p class="body-copy">${esc(l.note)}</p>
          <div class="archive-item__actions">
            <a class="link-action" href="${l.url}">Open landing page <span class="arrow" aria-hidden="true">&#8599;</span></a>${extra}
          </div>
        </div>
      </article>`;
  }).join('\n');
}

function landingArchive(opts) {
  return `    <div class="archive">
${landingItems(opts)}
    </div>`;
}

/* ---------------------------------------------------------- email archive */

function emailItems({ limit = emails.length } = {}) {
  return emails.slice(0, limit).map((e, i) => {
    const flip = i % 2 === 1 ? ' email-item--flip' : '';
    // Image-only emails render at their native width so the artwork is never
    // upscaled and blurred; HTML emails fill the frame and stay responsive.
    const stage = e.mode === 'image'
      ? `          <div class="email-item__scroll email-item__scroll--art">
            <img src="${e.image}" alt="${esc(e.imageAlt)}" width="${e.width}" height="${e.height}" loading="lazy" decoding="async">
          </div>`
      : `          <div class="email-item__scroll">
            <iframe src="${e.url}" title="${esc(e.title)} email preview" loading="lazy" style="height:${e.frameHeight}px"></iframe>
          </div>`;

    return `      <article class="email-item${flip}" data-reveal>
        <div class="email-item__body">
          <span class="label label--dot">${esc(e.no)} / ${esc(e.kind)}</span>
          <h3 class="d-md" style="margin:.5em 0 .4em">${esc(e.title)}</h3>
          <p class="body-copy">${esc(e.note)}</p>
          <div class="tag-row" style="margin:18px 0">
${e.tags.map((t) => `            <span class="tag">${esc(t)}</span>`).join('\n')}
          </div>
          <a class="link-action" href="${e.url}" target="_blank" rel="noopener">Open full email <span class="arrow" aria-hidden="true">&#8599;</span></a>
        </div>
        <div class="email-item__stage">
${stage}
          <div class="email-item__caption">
            <span class="label">${esc(e.title)}</span>
            <span class="label">Scroll to read</span>
          </div>
        </div>
      </article>`;
  }).join('\n');
}

function emailArchive(opts) {
  return `    <div class="email-list">
${emailItems(opts)}
    </div>`;
}

/* Hero filmstrip: every frame links to a real page. */
function strip() {
  const frames = [
    ...projects.map((p) => ({ href: p.href, img: p.image, alt: p.imageAlt, label: p.title })),
    ...landing.map((l) => ({ href: l.url, img: l.shot, alt: l.shotAlt, label: l.title }))
  ];
  return `          <div class="hero__strip-track">
${frames.map((f) => `            <a class="hero__frame" href="${f.href}" aria-label="${esc(f.label)}">
              <img src="${f.img}" alt="" width="240" height="180" loading="lazy" decoding="async">
              <span aria-hidden="true">${esc(f.label)}</span>
            </a>`).join('\n')}
          </div>`;
}

/* -------------------------------------------------------- other fragments */

function disciplineGrid() {
  return `    <div class="discipline-grid">
${disciplines.map((d) => `      <article class="discipline" data-reveal>
        <span class="discipline__no">${esc(d.no)}</span>
        <h3>${esc(d.title)}</h3>
        <p>${esc(d.note)}</p>
      </article>`).join('\n')}
    </div>`;
}

function marqueeBand() {
  const run = marquee.map((m) => `<span>${esc(m)}</span>`).join('');
  return `    <div class="marquee" aria-hidden="true">
      <div class="marquee__track">${run}${run}</div>
    </div>`;
}

/* Next-project link at the foot of a case study. */
function nextProject(currentId) {
  const i = projects.findIndex((p) => p.id === currentId);
  const next = projects[(i + 1) % projects.length];
  return `  <a class="next-project" href="${next.href}">
    <span class="next-project__bg" aria-hidden="true">
      <img src="${next.image}" alt="" width="${next.width}" height="${next.height}" loading="lazy" decoding="async">
    </span>
    <span class="shell next-project__inner">
      <span class="label label--dot">Next project</span>
      <span class="next-project__title">${esc(next.title)}</span>
      <span class="label" style="display:block;margin-top:14px">${esc(next.client)} &mdash; ${esc(next.category)}</span>
    </span>
  </a>`;
}

/* ------------------------------------------------------------- injection */

const builders = {
  header,
  'mobile-menu': mobileMenu,
  contact,
  'work-index': workIndex,
  'work-index-featured': () => workIndex({ limit: 3 }),
  'landing-archive': landingArchive,
  'landing-archive-featured': () => landingArchive({ limit: 2 }),
  'email-archive': emailArchive,
  'email-archive-featured': () => emailArchive({ limit: 2 }),
  strip,
  disciplines: disciplineGrid,
  marquee: marqueeBand,
  'next-project': nextProject
};

const files = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
let touched = 0;

for (const file of files) {
  const path = join(ROOT, file);
  let html = readFileSync(path, 'utf8');
  if (!html.includes('<!-- build:')) continue;

  const active = (html.match(/data-page="([^"]+)"/) || [])[1] || '';
  const caseId = (html.match(/data-case="([^"]+)"/) || [])[1] || '';
  const before = html;

  html = html.replace(
    /([ \t]*)<!-- build:([a-z-]+) -->[\s\S]*?<!-- \/build:\2 -->/g,
    (match, indent, name) => {
      const build = builders[name];
      if (!build) throw new Error(`${file}: unknown build region "${name}"`);
      const body = build(name === 'next-project' ? caseId : active);
      return `${indent}<!-- build:${name} -->\n${body}\n${indent}<!-- /build:${name} -->`;
    }
  );

  if (html !== before) {
    writeFileSync(path, html);
    touched++;
    console.log(`built  ${file}`);
  } else {
    console.log(`ok     ${file}`);
  }
}

console.log(`\n${touched} file(s) updated.`);
