"""Launcher assets from the render.

The mark is the render at assets/source/mark.jpg: a P of brushed pipe on a
brown ground with a dimension triangle beside it. Two things change on the way
to the launcher; everything else is cropping.

The triangle's sides go dashed. The render draws them as hairlines, and a
hairline is gone by 48px. The sides are lifted off the ground (a diffusion
fill over the band they sit in, so the ground under them matches the ground
beside them) and drawn again as dashes at twice the weight, in the ink the
render mixed for them. The right-angle mark is redrawn at the same weight; the
letters are left alone.

The rounded corners are squared off. The render comes with its corners cut to
white, and a launcher icon has to be full-bleed: iOS and Android each mask it
themselves, and a pre-cut corner shows as a notch inside theirs. The ground is
carried out to the edge along each corner's radius.

    python3 tools/icons.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent.parent
SRC = HERE / 'assets/source/mark.jpg'

INK = (100, 125, 147)      # the dimension's blue-grey, sampled off the render
GROUND = (77, 53, 41)      # the brown behind everything; app.json carries it too

# The render's frame is 2000px. These are centrelines, measured off it.
CORNER = 304                              # radius the render cut its corners to
FOOT, HEEL, TOP = (772, 1654), (1312, 1654), (1312, 1168)   # right angle at HEEL
BOX = 76                                  # right-angle mark, sides along the legs
HAIR = 5                                  # the render's line width
LINE, DASH, GAP = 10, 32, 18              # what gets drawn instead
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


def lift(a):
    """Fill the band under the render's lines from the ground either side."""
    sides, box = lines()
    x0, y0, x1, y1 = FOOT[0] - 40, TOP[1] - 40, HEEL[0] + 40, HEEL[1] + 40
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(float)
    band = np.zeros(yy.shape, bool)
    for p, q in sides + box:
        band |= seg_dist(xx, yy, p, q) <= HAIR / 2 + 6
    crop = a[y0:y1, x0:x1].astype(float)
    fixed = ~band
    fill = crop.copy()
    fill[band] = crop[fixed].mean(0)
    for _ in range(400):
        avg = (np.roll(fill, 1, 0) + np.roll(fill, -1, 0) + np.roll(fill, 1, 1) + np.roll(fill, -1, 1)) / 4
        fill[band] = avg[band]
    rng = np.random.default_rng(304)
    fill[band] += rng.normal(0, 0.55, (band.sum(), 3))
    a[y0:y1, x0:x1] = np.clip(np.rint(fill), 0, 255)
    return a


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


def redraw(a):
    n = a.shape[0]
    mask = Image.new('L', (n * SS, n * SS), 0)
    d = ImageDraw.Draw(mask)
    sides, box = lines()
    for p, q in sides:
        dashes(d, p, q, SS)
    hx, hy = HEEL
    # The right-angle mark, solid, with square corners where its two sides meet.
    stroke(d, (hx - BOX, hy - LINE / 2), (hx - BOX, hy - BOX), SS)
    stroke(d, (hx - BOX - LINE / 2, hy - BOX), (hx, hy - BOX), SS)
    alpha = np.asarray(mask.resize((n, n), Image.BOX)).astype(float)[..., None] / 255
    return a * (1 - alpha) + np.array(INK, float) * alpha


def content_box(a):
    """Where the mark is, by how far the pixels sit from the ground."""
    d = np.abs(a - np.array(GROUND, float)).sum(-1) > 18
    ys, xs = np.nonzero(d)
    return xs.min(), ys.min(), xs.max(), ys.max()


def full(img, size):
    return img.resize((size, size), Image.LANCZOS)


def windowed(img, box, size, radius):
    """The mark centred on a brown canvas, its box's corners inside a circle of
    `radius` (as a fraction of `size`): the part a masked launcher will show."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    s = radius * size * 2 / np.hypot(w, h)
    n = img.width
    scaled = img.resize((round(n * s), round(n * s)), Image.LANCZOS)
    canvas = Image.new('RGB', (size, size), GROUND)
    # Feathered edge so the scaled render blends into the flat canvas ground.
    m = scaled.width
    feather = round(m * 0.06)
    e = np.minimum(np.minimum(np.arange(m), np.arange(m)[::-1]) / feather, 1)
    alpha = Image.fromarray((np.minimum.outer(e, e) * 255).astype(np.uint8))
    ox = round(size / 2 - (x0 + w / 2) * s)
    oy = round(size / 2 - (y0 + h / 2) * s)
    canvas.paste(scaled, (ox, oy), alpha)
    return canvas


def plated(img, size, plate=0.90, radius=0.224):
    """The full icon on a rounded plate with transparent corners, for the splash."""
    m = round(size * plate)
    tile = full(img, m)
    mask = Image.new('L', (m * SS, m * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, m * SS - 1, m * SS - 1], radius=m * SS * radius, fill=255)
    tile.putalpha(mask.resize((m, m), Image.BOX))
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(tile, ((size - m) // 2, (size - m) // 2), tile)
    return out


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    a = square_corners(a)
    a = lift(a)
    a = redraw(a)
    box = content_box(a)
    img = Image.fromarray(np.clip(np.rint(a), 0, 255).astype(np.uint8))

    out = {
        'assets/icon.png': full(img, 1024),
        # Android shows the middle 66dp of a 108dp foreground; on a circle
        # launcher that window is a circle of radius 0.306. Keep a hair inside.
        'assets/adaptive-icon.png': windowed(img, box, 1024, 0.29),
        'assets/splash-icon.png': plated(img, 1024),
        'assets/favicon.png': full(img, 64),
        'public/icon-192.png': full(img, 192),
        'public/icon-512.png': full(img, 512),
        'public/apple-touch-icon.png': full(img, 180),
        # A maskable icon's safe zone is a circle of radius 0.40.
        'public/icon-maskable-512.png': windowed(img, box, 512, 0.38),
    }
    for name, image in out.items():
        path = HERE / name
        image.save(path, optimize=True)
        print(f'{name:34} {path.stat().st_size / 1024:6.1f} KB')


if __name__ == '__main__':
    main()
