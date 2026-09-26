"""Launcher assets from the render.

The mark is the render at assets/source/mark.jpg: a P of brushed pipe on a
brown ground with a dimension triangle beside it. Four things change on the
way to the launcher; everything else is cropping.

The ground goes deep bronze and the pipe goes chrome. The render's ground is
a muted brown and its steel a soft grey, and at 48px the two run together.
Pipe and ground are told apart by warmth (the ground is a third redder than
it is blue, the steel is neutral), the ground is re-tinted in proportion so
its soft shadows survive, and the steel gets a harder tone curve.

The triangle and its letters are drawn again. The render draws the sides as
hairlines and the letters small, and both are gone by 48px. They are lifted
off the ground (a diffusion fill over the band they sit in) and drawn again
in light slate blue: the sides dashed at four times the weight, the letters
in the app's own bold sans a size up.

The rounded corners are squared off. The render comes with its corners cut to
white, and a launcher icon has to be full-bleed: iOS and Android each mask it
themselves, and a pre-cut corner shows as a notch inside theirs.

And the mark is fitted to the circle a launcher shows, not to its bounding
box. The smallest circle round the pipe and triangle is found and scaled to
the safe circle of each masked format, which is how far a P can fill a round
window without its fittings being cut off.

    python3 tools/icons.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent.parent
SRC = HERE / 'assets/source/mark.jpg'
FONT = HERE / 'node_modules/@expo-google-fonts/source-sans-3/700Bold/SourceSans3_700Bold.ttf'

INK = (157, 183, 211)      # light slate blue, for the dimension and its letters
GROUND = (74, 44, 20)      # deep bronze; app.json carries it as #4A2C14
BROWN = (77, 53, 41)       # the render's flat ground, which GROUND replaces

# The render's frame is 2000px. These are centrelines, measured off it.
CORNER = 304                              # radius the render cut its corners to
FOOT, HEEL, TOP = (772, 1654), (1312, 1654), (1312, 1168)   # right angle at HEEL
BOX = 76                                  # right-angle mark, sides along the legs
HAIR = 5                                  # the render's line width
LINE, DASH, GAP = 18, 40, 22              # what gets drawn instead
LETTERS = {'C': (966, 1356), 'B': (1406, 1426), 'A': (1059, 1756)}   # centres
LETTER_SIZE = 196                         # cap height about 130px
SS = 4                                    # supersample for the drawn lines


def square_corners(a):
    """Carry the ground out through the white corners, radially.

    The corners are not circular arcs: the render cut a squircle, which sits
    some 15px inside a circle of the same radius along the diagonal. So the
    white is found by looking at it rather than by geometry, grown by a few
    pixels to take the anti-aliased rim with it, and each white pixel takes
    the ground from a point well inside the curve on its own radial."""
    n = a.shape[0]
    R, B = CORNER, CORNER + 60      # the block reaches past where the curve meets the edge
    yy, xx = np.mgrid[0:B, 0:B].astype(float)
    for cx, cy, sx, sy in [(R, R, 0, 0), (n - 1 - R, R, n - B, 0),
                           (R, n - 1 - R, 0, n - B), (n - 1 - R, n - 1 - R, n - B, n - B)]:
        block = a[sy:sy + B, sx:sx + B]
        out = block.max(-1) > 95          # white, and the haze it fades through
        for _ in range(6):
            grown = out.copy()
            grown[1:] |= out[:-1]
            grown[:-1] |= out[1:]
            grown[:, 1:] |= out[:, :-1]
            grown[:, :-1] |= out[:, 1:]
            out = grown
        dx, dy = xx + sx - cx, yy + sy - cy
        k = (R - 30) / np.maximum(np.hypot(dx, dy), 1)
        qx = np.clip(np.rint(cx + dx * k), 0, n - 1).astype(int)
        qy = np.clip(np.rint(cy + dy * k), 0, n - 1).astype(int)
        block[out] = a[qy[out], qx[out]]
    return a


def seg_dist(xx, yy, p, q):
    (x0, y0), (x1, y1) = p, q
    vx, vy = x1 - x0, y1 - y0
    t = np.clip(((xx - x0) * vx + (yy - y0) * vy) / (vx * vx + vy * vy), 0, 1)
    return np.hypot(xx - (x0 + t * vx), yy - (y0 + t * vy))


def lines():
    hx, hy = HEEL
    sides = [(FOOT, HEEL), (HEEL, TOP), (TOP, FOOT)]
    box = [((hx - BOX, hy), (hx - BOX, hy - BOX)), ((hx - BOX, hy - BOX), (hx, hy - BOX))]
    return sides, box


def grow(mask, by):
    for _ in range(by):
        g = mask.copy()
        g[1:] |= mask[:-1]
        g[:-1] |= mask[1:]
        g[:, 1:] |= mask[:, :-1]
        g[:, :-1] |= mask[:, 1:]
        mask = g
    return mask


def lift(a):
    """Fill the ground back in under the render's lines and letters."""
    sides, box = lines()
    x0, y0, x1, y1 = 720, 1120, 1480, 1800
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(float)
    crop = a[y0:y1, x0:x1]
    band = np.zeros(yy.shape, bool)
    for p, q in sides + box:
        band |= seg_dist(xx, yy, p, q) <= HAIR / 2 + 6
    # The letters, by their blue-grey ink, grown to take the soft edge with them.
    band |= grow((crop[..., 2] - crop[..., 0] > 12) & (crop[..., 2] > 70), 5)
    fixed = ~band
    fill = crop.copy()
    fill[band] = crop[fixed].mean(0)
    for _ in range(600):
        avg = (np.roll(fill, 1, 0) + np.roll(fill, -1, 0) + np.roll(fill, 1, 1) + np.roll(fill, -1, 1)) / 4
        fill[band] = avg[band]
    rng = np.random.default_rng(304)
    fill[band] += rng.normal(0, 0.55, (band.sum(), 3))
    a[y0:y1, x0:x1] = np.clip(fill, 0, 255)
    return a


def steel_mask(a):
    """1 on the pipe, 0 on the ground, by warmth: red over blue as a share of red."""
    warmth = (a[..., 0] - a[..., 2]) / np.maximum(a[..., 0], 1)
    return np.clip((0.30 - warmth) / 0.15, 0, 1)


def retint(a):
    """Deep bronze ground, chrome pipe."""
    steel = steel_mask(a)[..., None]
    ground = a * (np.array(GROUND, float) / np.array(BROWN, float))
    lum = a @ np.array([0.299, 0.587, 0.114])
    chrome = np.clip(128 + (lum - 120) * 1.45 + 12, 0, 255)[..., None] + np.array([-3, 0, 5], float)
    return np.clip(ground * (1 - steel) + chrome * steel, 0, 255), steel[..., 0]


def dashes(draw, p, q, s):
    (x0, y0), (x1, y1) = p, q
    L = np.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    n = max(1, round((L - DASH) / (DASH + GAP)))       # gaps; a dash sits on each end
    gap = (L - (n + 1) * DASH) / n
    for i in range(n + 1):
        t0 = i * (DASH + gap)
        stroke(draw, (x0 + ux * t0, y0 + uy * t0), (x0 + ux * (t0 + DASH), y0 + uy * (t0 + DASH)), s)


def stroke(draw, p, q, s):
    (x0, y0), (x1, y1) = p, q
    L = np.hypot(x1 - x0, y1 - y0)
    nx, ny = -(y1 - y0) / L * LINE / 2, (x1 - x0) / L * LINE / 2
    draw.polygon([((x0 + nx) * s, (y0 + ny) * s), ((x1 + nx) * s, (y1 + ny) * s),
                  ((x1 - nx) * s, (y1 - ny) * s), ((x0 - nx) * s, (y0 - ny) * s)], fill=255)


def drawn_alpha(n):
    """Coverage of the dimension: dashed sides, right-angle mark, letters."""
    mask = Image.new('L', (n * SS, n * SS), 0)
    d = ImageDraw.Draw(mask)
    sides, _ = lines()
    for p, q in sides:
        dashes(d, p, q, SS)
    hx, hy = HEEL
    stroke(d, (hx - BOX, hy - LINE / 2), (hx - BOX, hy - BOX), SS)
    stroke(d, (hx - BOX - LINE / 2, hy - BOX), (hx, hy - BOX), SS)
    font = ImageFont.truetype(str(FONT), LETTER_SIZE * SS)
    for ch, (cx, cy) in LETTERS.items():
        l, t, r, b = font.getbbox(ch)
        d.text(((cx * SS) - (l + r) / 2, (cy * SS) - (t + b) / 2), ch, font=font, fill=255)
    return np.asarray(mask.resize((n, n), Image.BOX)).astype(float) / 255


def enclosing_circle(pts, rounds=3000):
    """Smallest circle round the points, to a fraction of a pixel."""
    c = pts.mean(0)
    for i in range(1, rounds + 1):
        d = np.hypot(*(pts - c).T)
        c = c + (pts[d.argmax()] - c) / (i + 1)
    return c, np.hypot(*(pts - c).T).max()


def fit(img, circle, size, radius, feather=0.06):
    """The mark on a bronze canvas, its enclosing circle scaled to `radius`
    (a fraction of `size`) and centred: the part a masked launcher shows."""
    (cx, cy), r = circle
    s = radius * size / r
    n = img.width
    scaled = img.resize((round(n * s), round(n * s)), Image.LANCZOS)
    canvas = Image.new('RGB', (size, size), GROUND)
    ox, oy = round(size / 2 - cx * s), round(size / 2 - cy * s)
    # Feather only the edges that land inside the canvas, so the scaled render
    # blends into the flat ground there and is left alone where it overflows.
    m = scaled.width
    f = max(1, round(m * feather))
    def ramp(o):
        e = np.ones(m)
        if o > 0:
            e = np.minimum(e, np.arange(m) / f)
        if o + m < size:
            e = np.minimum(e, np.arange(m)[::-1] / f)
        return np.minimum(e, 1)
    alpha = Image.fromarray((np.minimum.outer(ramp(oy), ramp(ox)) * 255).astype(np.uint8))
    canvas.paste(scaled, (ox, oy), alpha)
    return canvas


def plated(tile, size, plate=0.90, radius=0.224):
    """The icon on a rounded plate with transparent corners, for the splash."""
    m = round(size * plate)
    tile = tile.resize((m, m), Image.LANCZOS)
    mask = Image.new('L', (m * SS, m * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, m * SS - 1, m * SS - 1], radius=m * SS * radius, fill=255)
    tile.putalpha(mask.resize((m, m), Image.BOX))
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(tile, ((size - m) // 2, (size - m) // 2), tile)
    return out


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    n = a.shape[0]
    a = square_corners(a)
    a = lift(a)
    a, steel = retint(a)
    ink = drawn_alpha(n)
    a = a * (1 - ink[..., None]) + np.array(INK, float) * ink[..., None]
    img = Image.fromarray(np.clip(np.rint(a), 0, 255).astype(np.uint8))

    # The circle round what is drawn: steel, dashes and letters. The soft
    # shadow is ground and may fall outside it.
    content = (steel > 0.5) | (ink > 0.3)
    ys, xs = np.nonzero(content[::4, ::4])
    circle = enclosing_circle(np.stack([xs * 4.0, ys * 4.0], 1))

    icon = fit(img, circle, 1024, 0.46)
    out = {
        'assets/icon.png': icon,
        # Android shows the middle 66dp of a 108dp foreground; on a circle
        # launcher that window is a circle of radius 0.306.
        'assets/adaptive-icon.png': fit(img, circle, 1024, 0.305),
        'assets/splash-icon.png': plated(icon, 1024),
        'assets/favicon.png': icon.resize((64, 64), Image.LANCZOS),
        'public/icon-192.png': icon.resize((192, 192), Image.LANCZOS),
        'public/icon-512.png': icon.resize((512, 512), Image.LANCZOS),
        'public/apple-touch-icon.png': icon.resize((180, 180), Image.LANCZOS),
        # A maskable icon's safe zone is a circle of radius 0.40.
        'public/icon-maskable-512.png': fit(img, circle, 512, 0.39),
    }
    for name, image in out.items():
        path = HERE / name
        image.save(path, optimize=True)
        print(f'{name:34} {path.stat().st_size / 1024:6.1f} KB')
    (cx, cy), r = circle
    print(f'mark circle: centre ({cx:.0f}, {cy:.0f}) radius {r:.0f} of {n}')


if __name__ == '__main__':
    main()
