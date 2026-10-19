"""Regrade the hero cut-out from the studio original.

usage: python3 tools/relight-hero.py images/portrait-studio-arms.jpg \
         assets/images/home/hero-reach.webp out.webp [core-erosion=15]

The cut-out is a 1:1 crop of the original at (168, 128). Its alpha (and the
amber glow painted into the soft edge) is kept; the interior is relit from
the original: face near studio exposure, warm key from camera-right where
the hero glow sits, body falling off into the red.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
orig_p, cut_p, out_p = sys.argv[1:4]
cut = Image.open(cut_p).convert('RGBA')
W, H = cut.size
alpha = np.asarray(cut)[..., 3].astype(np.float32) / 255
src = Image.open(orig_p).convert('RGB').crop((168, 128, 168 + W, 128 + H))
rgb = np.asarray(src).astype(np.float32) / 255
lin = rgb ** 2.2
solid = (alpha > 0.98).astype(np.float32)
er = np.asarray(Image.fromarray((solid*255).astype(np.uint8)).filter(ImageFilter.MinFilter(7))).astype(np.float32)/255
num = np.zeros_like(lin); den = np.zeros_like(er)
for r in (4, 10, 24):
    bl = lambda a: np.asarray(Image.fromarray(a).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)
    n = np.dstack([bl((lin[..., i]*er*255).astype(np.uint8)) for i in range(3)])/255
    d = bl((er*255).astype(np.uint8))/255
    m = (den < 0.05)
    num[m] = n[m]; den[m] = d[m]
fill = num / np.maximum(den, 1e-3)[..., None]
lin = lin * er[..., None] + np.clip(fill, 0, 1) * (1 - er[..., None])

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
u, v = xx / W, yy / H

# Ambient: darken the body toward the bottom so the suit sinks into the red,
# but keep the head near studio exposure.
head = np.exp(-(((u - 0.505) / 0.24) ** 2 + ((v - 0.17) / 0.17) ** 2))
fall = np.clip(1 - (v - 0.22) / 0.78, 0, 1)
ambient = 0.10 + 0.16 * fall + 0.62 * head

# Key light from camera-right / above, where the hero's amber glow sits.
key = np.clip(0.5 + 0.9 * (u - 0.5), 0, 1) * np.clip(1.2 - v * 1.1, 0, 1)
key = key * (0.35 + 0.65 * head)
gain = ambient + 0.30 * key

# Warm the light: amber key, slightly cooler shadows kept dark.
warm = np.stack([1.10, 0.93, 0.78])
light = gain[..., None] * (1 + (warm - 1) * np.clip(key + 0.4 * head, 0, 1)[..., None])
out = lin * light

# Rim light along the silhouette, stronger on the glow side.
a_img = Image.fromarray((alpha * 255).astype(np.uint8))
inner = np.asarray(a_img.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
rim = np.clip(alpha - inner, 0, 1)
rim = np.asarray(Image.fromarray((rim * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255
rim *= 0.35 + 0.65 * np.clip(u * 1.4 - 0.2, 0, 1)
rim *= np.clip(1.25 - v, 0.2, 1)
out += rim[..., None] * np.array([1.0, 0.55, 0.22]) * 0.32

# Soft filmic shoulder so the white shirt and teeth don't clip.
out = out / (1 + 0.35 * out)
out = out / (1 / (1 + 0.35))
res = np.clip(out, 0, 1) ** (1 / 2.2)
# Gentle contrast S-curve.
res = res + 0.12 * (res - 0.5) * (1 - np.abs(2 * res - 1))
res = np.clip(res, 0, 1)
# The cut-out's soft edge carries a painted amber glow; keep those pixels from
# the existing cut-out and use the relit photo only for the solid interior.
cut_rgb = np.asarray(cut)[..., :3].astype(np.float32) / 255
core = Image.fromarray(((alpha > 0.995) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(int(sys.argv[4]) if len(sys.argv) > 4 else 15))
core = np.asarray(core.filter(ImageFilter.GaussianBlur(4))).astype(np.float32)[..., None] / 255
res = res * core + cut_rgb * (1 - core)
img = np.dstack([res * 255, alpha * 255]).astype(np.uint8)
Image.fromarray(img, 'RGBA').save(out_p, 'WEBP', quality=88, method=6)
