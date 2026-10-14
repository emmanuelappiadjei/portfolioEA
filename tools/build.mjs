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
const { meta, nav, projects, landing, emails, disciplines } = data;

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* ---------------------------------------------------------------- partials */

function header(active) {
  const links = nav.filter((n) => n.desktop).map((n) => {
    const current = n.id === active ? ' aria-current="page"' : '';
    return `        <a class="nav__link" href="${n.href}"${current}>${esc(n.label)}</a>`;
  }).join('\n');

  // The name is set in lowercase on purpose; it is the whole wordmark.
  return `  <header class="site-header">
    <div class="site-header__bar">
      <a class="brand" href="index.html">${esc(meta.name.toLowerCase())}</a>
      <nav class="nav" aria-label="Primary">
${links}
      </nav>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu">
        <span class="menu-toggle__open">Menu</span><span class="menu-toggle__close">Close</span>
      </button>
    </div>
  </header>`;
}

function mobileMenu(active) {
  const links = nav.map((n) => {
    const current = n.id === active ? ' aria-current="page"' : '';
    return `    <a class="mobile-menu__link" href="${n.href}"${current}>${esc(n.label)}</a>`;
  }).join('\n');

  return `  <div class="mobile-menu" id="mobile-menu">
${links}
    <div class="mobile-menu__foot">
      <a class="label" href="mailto:${meta.email}">${esc(meta.email)}</a>
      <span class="label">${esc(meta.location)}</span>
    </div>
  </div>`;
}

function contact() {
  return `  <section class="contact-block" id="contact">
    <img class="contact-block__sky" src="assets/images/home/nashville.svg" alt="" width="1600" height="324" loading="lazy" decoding="async">
    <div class="shell">
      <p class="contact-block__ask">${esc(meta.contactPrompt)}</p>
      <a class="contact-mail" href="mailto:${meta.email}">${esc(meta.email)}</a>
      <p class="contact-block__actions">
        <button class="contact-copy" type="button" data-copy="${meta.email}">Copy address</button>
        <span class="contact-copy__status" aria-live="polite"></span>
      </p>
    </div>

    <footer class="site-foot">
      <div class="shell site-foot__row">
        <span class="label">&copy; <span data-year>2026</span> ${esc(meta.name)}</span>
        <div class="site-foot__links">
${nav.map((n) => `          <a class="label" href="${n.href}">${esc(n.label)}</a>`).join('\n')}
        </div>
        <span class="label">${esc(meta.descriptor)}</span>
      </div>
    </footer>
  </section>`;
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
            <span class="label">${esc(l.no)} / ${esc(l.category)}</span>
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
          <span class="label">${esc(e.no)} / ${esc(e.kind)}</span>
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

/* Next-project link at the foot of a case study. */
function nextProject(currentId) {
  const i = projects.findIndex((p) => p.id === currentId);
  const next = projects[(i + 1) % projects.length];
  return `  <a class="next-project" href="${next.href}">
    <span class="next-project__bg" aria-hidden="true">
      <img src="${next.image}" alt="" width="${next.width}" height="${next.height}" loading="lazy" decoding="async">
    </span>
    <span class="shell next-project__inner">
      <span class="label">Next project</span>
      <span class="next-project__title">${esc(next.title)}</span>
      <span class="label" style="display:block;margin-top:14px">${esc(next.client)} &mdash; ${esc(next.category)}</span>
    </span>
  </a>`;
}

/* ---------------------------------------------------------------- homepage */
/* Work as a stack of prints: each card sticks a little lower than the last,
   so they pile up as the page scrolls. Four tones, in order. */
function homeWork() {
  return `      <div class="home-stack">
${projects.map((p, i) => `        <article class="home-card home-card--${(i % 4) + 1}">
          <div class="home-card__pic"><img src="${p.image}" alt="${esc(p.imageAlt)}" width="${p.width}" height="${p.height}" loading="lazy" decoding="async"></div>
          <div class="home-card__txt">
            <div class="home-card__meta"><span class="label">${esc(p.client)}</span><span class="label">${esc(/^\d{4}$/.test(p.year) ? p.year : 'Concept')}</span></div>
            <h3 class="home-card__title">${esc(p.title)}</h3>
            <p class="home-card__role">${esc(p.role)}</p>
            <div class="home-card__res">
              <div><strong>${esc(p.result)}</strong><span>${esc(p.resultNote)}</span></div>
              <a class="text-link" href="${p.href}">Case study <span class="arrow" aria-hidden="true">&#8599;</span></a>
            </div>
          </div>
        </article>`).join('\n')}
      </div>`;
}

/* Pages and emails at full width, drifting past. The set is written twice so
   the drift loops seamlessly; the copy is hidden from assistive tech. Frame
   width follows the screen's own proportions: landing pages are wide, emails
   narrow, and the Peacefest artwork narrower still. */
function homeScreens() {
  const items = [];
  const ratioFor = (w) => (w >= 860 ? 0.92 : w >= 600 ? 0.74 : 0.5);
  const tilt = [-1.5, 1.5, -1, 2, -1.5, 1, -2];
  const pages = landing.map((l) => ({ src: l.shot, w: l.width, h: l.height, alt: l.shotAlt, title: `${l.title} landing page`, href: l.url, ar: 0.92 }));
  const mails = emails.map((e) => e.mode === 'image'
    ? { src: e.image, w: e.width, h: e.height, alt: e.imageAlt, title: `${e.title} email`, href: e.url, ar: ratioFor(e.width) }
    : { src: e.poster, w: e.posterWidth, h: e.posterHeight, alt: `${e.title} email, full length`, title: `${e.title} email`, href: e.url, ar: 0.74 });
  // Alternate a page and an email so the wall has rhythm.
  for (let i = 0; i < Math.max(pages.length, mails.length); i++) {
    if (pages[i]) items.push(pages[i]);
    if (mails[i]) items.push(mails[i]);
  }
  const shot = (it, i, dup) => `          <button class="home-shot" type="button" style="--ar:${it.ar};--r:${tilt[i % tilt.length]}deg" data-full="${it.src}" data-href="${it.href}" data-title="${esc(it.title)}"${dup ? ' aria-hidden="true" tabindex="-1"' : ` aria-label="Open the full ${esc(it.title)}"`}>
            <img src="${it.src}" alt="${dup ? '' : esc(it.alt)}" width="${it.w}" height="${it.h}" loading="lazy" decoding="async">
          </button>`;
  return `        <div class="home-screens__rail">
${items.map((it, i) => shot(it, i, false)).join('\n')}
${items.map((it, i) => shot(it, i, true)).join('\n')}
        </div>`;
}

function homeCaps() {
  return disciplines.map((d) => `      <div class="home-cap"><h3>${esc(d.title)}</h3><p>${esc(d.note)}</p></div>`).join('\n');
}

/* ------------------------------------------------------------- injection */

const builders = {
  header,
  'mobile-menu': mobileMenu,
  contact,
  'work-index': workIndex,
  'landing-archive': landingArchive,
  'email-archive': emailArchive,
  disciplines: disciplineGrid,
  'home-work': homeWork,
  'home-screens': homeScreens,
  'home-caps': homeCaps,
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
