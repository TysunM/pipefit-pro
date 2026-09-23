"""Brushed-metal grain for the app's surfaces.

One tileable alpha texture, white streaks on transparent. The app tints and
fades it per theme, so light and dark share the same grain.

Tileable by construction: every smoothing wraps around both edges, so the
right edge meets the left and the bottom meets the top with no seam.

    python3 tools/finish.py
"""
import numpy as np
from PIL import Image

N = 256
rng = np.random.default_rng(1957)

def wrap_blur(a, width, axis):
    # Box blur with wrap-around, done as a running mean over a rolled stack.
    out = np.zeros_like(a)
    for k in range(-(width // 2), width // 2 + 1):
        out += np.roll(a, k, axis=axis)
    return out / (2 * (width // 2) + 1)

fine = rng.standard_normal((N, N))
streak = wrap_blur(fine, 61, axis=1)          # long horizontal pulls
streak = streak / streak.std()
band = wrap_blur(rng.standard_normal((N, 1)).repeat(N, 1), 9, axis=0)
band = band / band.std()                      # wider groups of streaks
grain = wrap_blur(rng.standard_normal((N, N)), 5, axis=1)
grain = grain / grain.std()

v = 0.62 * streak + 0.28 * band + 0.10 * grain
v = (v - v.min()) / (v.max() - v.min())
alpha = np.clip(v * 255, 0, 255).astype(np.uint8)

rgba = np.zeros((N, N, 4), np.uint8)
rgba[..., :3] = 255
rgba[..., 3] = alpha
Image.fromarray(rgba, 'RGBA').save('assets/finish/brushed.png', optimize=True)
print('assets/finish/brushed.png', alpha.mean().round(1))
