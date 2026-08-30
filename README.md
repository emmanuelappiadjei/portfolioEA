# Emmanuel Appiadjei — Portfolio

A static, dependency-free portfolio for creative and content marketing work:
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

Loads the homepage at nine viewport sizes, maps the portrait's measured face
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
  css/fonts.css      Self-hosted Inter + Inter Tight @font-face rules
  data/site.json     Projects, landing pages, emails, navigation, disciplines
  fonts/             woff2 files
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
| `--body-dark` | `#b8b3c0` | Body copy on dark surfaces |
| `--body-light` | `#454149` | Body copy on light surfaces |
| `--purple` | `#81749f` | Focus rings, one accent per section |
| `--purple-soft` | `#aaa0bc` | Tint-surface body copy, accent word |

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

Inter Tight for display, Inter for body, both self-hosted. Body size, leading,
tracking, and weight come from `--body-size` / `--body-leading` /
`--body-tracking` / `--weight-body` and are applied at the `body` and `p`
level, so every page and case study shares one paragraph style. Display sizes
are `clamp()`, so there are no font-size breakpoints to keep in sync.

### Header

Fixed, fully transparent, no container, no border, no blur. Contrast is
adaptive: `mix-blend-mode: difference` inverts it against whatever is beneath,
so the same markup reads on black, on soft white, over photography, and over
the tinted sections. It tucks away on downward scroll, returns on upward
scroll, and retires entirely once the closing contact block reaches the top of
the viewport. Nothing between it and the page may set `isolation` or paint an
opaque background, or the blend stops working.

### Hero safe zone

The hero name is never allowed to touch the portrait's face. The face position
is measured from the source file rather than estimated — the lit features
occupy x 58.9–70.8% and y 36.3–65.6%; everything left of 52% and above 34% is
studio black. `--hero-focus-x`, `--hero-media-top`, and `--hero-safe-width` are
set per breakpoint from those numbers, and a Playwright check maps the face box
through the `object-fit: cover` geometry at nine viewport sizes and asserts no
text element intersects it.

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
- The Canva deck embeds on the two speculative case studies are external
  iframes; both pages note that and stay readable if the embed is blocked.
- Speculative work is labelled as such everywhere it appears, and its numbers
  are presented as modelled targets rather than results.
