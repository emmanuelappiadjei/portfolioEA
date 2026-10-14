/**
 * Hero safe-zone check.
 *
 * Maps the hero cut-out's measured head box through the rendered
 * `object-fit: contain` geometry at nine viewport sizes and asserts that no
 * text element in the hero or the fixed header overlaps it. The giant word
 * behind the figure is excluded: it sits behind him by design.
 *
 * Serve the site first (`npm start`), then:
 *   node tools/check-hero-safe-zone.mjs [http://localhost:8080]
 */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.argv[2] || 'http://localhost:8080';
const OUT = process.env.HERO_CHECK_OUT || '';
if (OUT) fs.mkdirSync(OUT, { recursive: true });

// Measured from the alpha of assets/images/home/hero-reach.webp (754 × 1222):
// the head, hair included, spans x 31.4–69.8% and y 0.5–30% (chin and neck).
// Padded a little on every side.
const FACE = { x0: 0.30, x1: 0.71, y0: 0.0, y1: 0.31 };

const b = await chromium.launch();
let bad = 0;
for (const [w, h] of [[1600,1000],[1440,900],[1280,800],[1024,768],[834,1112],[768,1024],[430,932],[390,844],[360,740]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1800);  // let the arrival animation settle

  const r = await p.evaluate((FACE) => {
    const img = document.querySelector('.home-hero__figure img');
    const box = img.getBoundingClientRect();
    const nw = img.naturalWidth, nh = img.naturalHeight;

    // object-fit: contain geometry
    const scale = Math.min(box.width / nw, box.height / nh);
    const dw = nw * scale, dh = nh * scale;
    const cs = getComputedStyle(img);
    const pos = cs.objectPosition.split(' ');
    const px = pos[0] === 'left' ? '0%' : pos[0] === 'right' ? '100%' : pos[0];
    const py = (pos[1] || pos[0]) === 'bottom' ? '100%' : (pos[1] || pos[0]) === 'top' ? '0%' : (pos[1] || '50%');
    const fx = parseFloat(px) / 100, fy = parseFloat(py) / 100;
    const offX = (box.width - dw) * fx;
    const offY = (box.height - dh) * fy;

    const face = {
      left:   box.left + offX + FACE.x0 * dw,
      right:  box.left + offX + FACE.x1 * dw,
      top:    box.top  + offY + FACE.y0 * dh,
      bottom: box.top  + offY + FACE.y1 * dh
    };

    // every element in the hero (and the fixed header) that paints text
    const nodes = [...document.querySelectorAll('.home-hero *, .site-header *')].filter(el => {
      if (el.closest('.home-hero__word')) return false;
      if (!el.textContent.trim()) return false;
      if (el.children.length && ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return false;
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity) > 0.05;
    });

    const hits = [];
    for (const el of nodes) {
      const q = el.getBoundingClientRect();
      if (q.width === 0 || q.height === 0) continue;
      const overlap = !(q.right < face.left || q.left > face.right || q.bottom < face.top || q.top > face.bottom);
      if (overlap) hits.push({
        text: el.textContent.trim().slice(0, 34),
        cls: (el.className || '').toString().slice(0, 34),
        rect: [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)]
      });
    }
    return { face: Object.fromEntries(Object.entries(face).map(([k,v]) => [k, Math.round(v)])), hits, box: [Math.round(box.width), Math.round(box.height)] };
  }, FACE);

  const ok = r.hits.length === 0;
  if (!ok) bad++;
  console.log(`${w}x${h}  face box L${r.face.left} T${r.face.top} R${r.face.right} B${r.face.bottom}  ->  ${ok ? 'CLEAR' : 'COLLISION: ' + JSON.stringify(r.hits)}`);

  // optional visual record of the zone
  if (OUT) {
    await p.evaluate((f) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${f.left}px;top:${f.top}px;width:${f.right-f.left}px;height:${f.bottom-f.top}px;border:2px solid #00ff88;z-index:99999;pointer-events:none`;
      document.body.appendChild(d);
    }, r.face);
    await p.screenshot({ path: `${OUT}/${w}x${h}.png` });
  }
  await p.close();
}
await b.close();
console.log(bad === 0 ? '\n\u2713 all breakpoints clear' : `\n${bad} breakpoint(s) with text over the face`);
process.exit(bad === 0 ? 0 : 1);
