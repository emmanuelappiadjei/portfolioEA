# Emmanuel Appiadjei — Portfolio

A static, dependency-free portfolio for creative and brand marketing work:
campaigns, events, landing pages, and email design.

Plain HTML, CSS, and JavaScript. No framework, no bundler, no runtime
dependencies. Node is used only for two small build/QA scripts, and the site
deploys as-is to GitHub Pages.

---

## Local preview

The site needs to be served over HTTP rather than opened from the filesystem —
the email previews use `<iframe>`, which browsers block on `file://`.

```bash
npm start                 # http://localhost:8080
```

or with any static server you already have:

```bash
python3 -m http.server 8080
npx serve .
```

## Deploying to GitHub Pages

The repository root *is* the site — there is no build output directory.

1. Push to `main` (or whichever branch you want to publish).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
4. Choose your branch and the **`/ (root)`** folder, then **Save**.

The site publishes at `https://<user>.github.io/<repo>/` within a minute or two.

Every asset path in the site is relative (`assets/…`, `images/…`,
`work.html`), so it works unchanged whether it is served from a repository
subpath, a user page, or a custom domain. `npm run check` fails the build if an
absolute path ever sneaks in.

`.nojekyll` is present so GitHub Pages serves the files verbatim instead of
running them through Jekyll.

---

## Editing content

Project, landing-page, and email entries live in one place:

```
assets/data/site.json
```

Add or edit an entry there, then regenerate the pages:

```bash
npm run build
```

`tools/build.mjs` renders the shared header, mobile menu, contact block, and
the project / landing / email indexes into every page between marked regions:

```html
<!-- build:work-index -->
   … generated markup …
<!-- /build:work-index -->
```

The generated HTML is committed, so the published site stays plain static HTML
with no client-side templating. Edit the region *source* in `tools/build.mjs`
or the data in `site.json` — never the generated markup directly, since the
next build overwrites it.

Copy that is unique to one page (case-study body text, the about biography) is
written directly in that page's HTML.

### Checking the site

```bash
npm run check
```

Verifies every internal link, image, `srcset` entry, and in-page anchor
resolves; flags duplicate `id`s, `<img>` without `alt`, pages with the wrong
number of `<h1>`s, and absolute paths that would break under a repository
subpath.

```bash
npm start          # in one terminal
npm run check:hero # in another
```

Loads the homepage at nine viewport sizes, maps the portrait's measured head
box through the rendered image geometry, and fails if any text in the hero or
the header overlaps it. Run this after touching the hero, the portrait, or the
type scale.

---

## Structure

```
index.html               Homepage
work.html                Case-study index
landing-pages.html       Landing-page archive
emails.html              Email archive
about.html               About
contact.html             Contact

hfma-annual.html                  ┐
family-carnival-campaign.html     │ Case studies
jafvisual.html                    │
artist-edition-campaign.html      │
valentino-bad-bunny-campaign.html ┘

landing-mahjong-social.html    ┐
landing-executive-dinner.html  │ Standalone landing pages —
landing-peacefest.html         │ each keeps its own self-contained
peace-grounds.html             │ design and is linked, not restyled
santo-sol-landing.html         ┘

email-peacefest.html        ┐
email-peacegrounds.html     │ Email builds, previewed live in iframes
email-hfma-track.html       │ on emails.html
mahjong-email-preview.html  ┘

assets/
  css/site.css       The whole design system
  css/fonts.css      Self-hosted Archivo @font-face rules (variable weight + width)
  data/site.json     Projects, landing pages, emails, navigation, disciplines
  fonts/             woff2 files
  images/home/       Homepage hero cut-out and the skyline drawing
  images/about/      The three photos in the homepage photo pile
  images/emails/     Full-length screenshots of the HTML emails
  images/            Portraits and web-optimised derivatives
  js/site.js         All site behaviour
images/              Original source photography and email artwork
tools/build.mjs      Renders shared partials into the pages
tools/check.mjs      Link, asset, and accessibility integrity check
legacy/              The previous design system, kept for reference
```

## Design system

Defined once as custom properties at the top of `assets/css/site.css`:

| Token | Value | Used for |
| --- | --- | --- |
| `--black` | `#09090a` | Page ground |
| `--graphite` | `#17171a` | Second surface |
| `--gray-dark` | `#2a292e` | Frames, media grounds |
| `--white` | `#f4f3f2` | Type on dark, light surfaces |
| `--gray-light` | `#d2cfd5` | Light-surface media ground |
| `--body-dark` | `#b6b2af` | Body copy on dark surfaces |
| `--body-light` | `#454341` | Body copy on light surfaces |
| `--accent` | `#ff5a1e` | Flame: the hero and closing sheets, focus rings, one accent per section |
| `--accent-soft` | `#ff8a3a` | Amber: the glow in the hero and closing gradients |
| `--ember` | `#c4162c` | The deep red the gradients fall into |

### Surfaces

Sections do not restyle their contents. Each one declares a role:

```html
<section data-surface="light"> … </section>
```

`black`, `graphite`, `light`, and `tint` each redefine four tokens —
`--ink`, `--ink-body`, `--ink-dim`, `--hairline` — and every component draws
from those, so a section flips its whole palette from one attribute. The page
alternates between them rather than running as one uninterrupted dark field.

### Type

One family, Archivo, self-hosted as variable fonts that carry both a weight
axis (100–900) and a width axis (62–125%). The site leans on the width axis
instead of a second typeface: wide and heavy for the big words on the homepage,
condensed (`--stretch-display`) for headings, slightly wide
(`--stretch-label`) for the small uppercase labels. Body size, leading,
tracking, and weight come from `--body-size` / `--body-leading` /
`--body-tracking` / `--weight-body` and are applied at the `body` and `p`
level, so every page and case study shares one paragraph style. Display sizes
are `clamp()`, so there are no font-size breakpoints to keep in sync.

### Header

Fixed, off-white type with no container: the full name in lowercase on the
left and plain text links on the right (a hairline sits under the current
page and wipes in on hover). On small screens the links fold into a drawer
opened by the word "Menu". At the top of a page the header sits straight on
the hero; once the page scrolls, a dark smoked bar fades in behind it so it
reads over light sections and photography. It tucks away on downward scroll,
returns on upward scroll, and retires entirely once the closing contact block
reaches the top of the viewport.

### Homepage

`index.html` is a poster first, then a campaign deck:

- **Hero** — a flame gradient with print grain. The Nashville skyline
  (`assets/images/home/nashville.svg`, a placeholder line drawing, swap in the
  final outline at the same path) rises from behind one giant word, and the
  cut-out portrait stands in front of both. The word is sized by script to
  span the screen whatever its length; change it in `index.html`
  (`.home-hero__word`). A small fanned deck of the project images leads
  down to the work.
- **Selected work** — every project as a big card; the cards are sticky at
  slightly different offsets, so they stack up as the page scrolls.
  Generated from `site.json` (`<!-- build:home-work -->`).
- **Pages and emails** — every landing page and email at full width, drifting
  past. Hovering a screen (or the first tap on touch) scrolls the long page
  through its frame; clicking (or the second tap) opens it full size with a
  link to the live page. Landing pages use their full-length `shot`; HTML
  emails use a full-length `poster` screenshot. Generated from `site.json`
  (`<!-- build:home-screens -->`).
- **About** — three photos in a pile. Tapping the pile sends the top print to
  the back and steps the story beside it on. The first page of the story is
  real markup; the other two are `<template>`s, so the section reads without
  script.
- **How I work** — the four disciplines as a list (`<!-- build:home-caps -->`).

The hero portrait (`assets/images/home/hero-reach.webp`) is the studio photo
`images/portrait-studio-arms.jpg` with the background removed and a light and
colour grade to match the orange hero: the face kept near studio exposure with
a warm key light from camera-right (where the hero's amber glow sits), the suit
falling off into the red, and a warm glow along the edges. Regenerate it with
`tools/relight-hero.py`. Nothing in the photo is generated or reshaped; the
grade only changes light and colour.

### Hero safe zone

Nothing in the hero is allowed to touch his face. The head box is measured
from the cut-out's alpha rather than estimated — hair included, the head
spans x 31.4–69.8% and y 0.5–30% of the image — and a Playwright check maps
that box through the `object-fit: contain` geometry at nine viewport sizes and
asserts no text element in the hero or the header intersects it. The giant
word is excluded on purpose: it sits behind him.

### Motion

Hand-rolled: one `requestAnimationFrame` loop drives everything that reads
scroll position, and `IntersectionObserver` handles reveals with a scroll sweep
behind it so nothing can stall at zero opacity. There is no animation library
to load or fail. All of it is disabled under `prefers-reduced-motion: reduce`,
which leaves a fully readable static page.

## Notes

- The two HubSpot emails (`email-hfma-track.html`, `mahjong-email-preview.html`)
  load their Revecore and SmarterDX logos from HubSpot's CDN, exactly as the
  delivered emails did. Those are the only external image requests on the site.
- The full-length email screenshots in `assets/images/emails/` were captured
  where HubSpot's CDN was unreachable, so the Revecore and SmarterDX logos are
  left out of them (the header simply has no logo, not a broken image).
  Re-capture them at 800px wide from a machine that can load the logos.
- The Canva deck embeds on the two speculative case studies are external
  iframes; both pages note that and stay readable if the embed is blocked.
- Speculative work is labelled as such everywhere it appears, and its numbers
  are presented as modelled targets rather than results.
