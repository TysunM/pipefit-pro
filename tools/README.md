# tools

`icons.py` renders every launcher and web icon from the render at
`assets/source/mark.jpg`, with Pillow and NumPy.

```
python3 tools/icons.py
```

The render arrives with white rounded corners and a hairline triangle. The
tool squares the corners off (a launcher icon is full-bleed; the platforms cut
their own corners) and redraws the triangle's sides as dashes at a weight that
survives 48px, leaving the pipe and the letters as rendered.

Outputs, all regenerated from one source so they never drift apart:

| File | Size | Notes |
| --- | --- | --- |
| `assets/icon.png` | 1024 | Full-bleed launcher icon |
| `assets/adaptive-icon.png` | 1024 | Android foreground; the mark sits inside the 66dp circle a launcher shows |
| `assets/splash-icon.png` | 1024 | The icon on a rounded plate, transparent corners |
| `assets/favicon.png` | 64 | Web |
| `public/icon-192.png`, `icon-512.png` | | PWA, `purpose: any` |
| `public/apple-touch-icon.png` | 180 | iOS home screen |
| `public/icon-maskable-512.png` | 512 | PWA, `purpose: maskable`, mark inside the 40% safe circle |

Replace `mark.jpg` and re-run. The triangle's centrelines are measured off the
render and set at the top of the script; a render with the triangle somewhere
else needs those numbers moved. Icons are native assets: a new build, not an
OTA update, is what puts them on a phone.

## docs.mjs — the guide as a PDF

Renders `docs/*.md` to the PDFs beside them, through the Chromium that
Playwright installs.

```
node tools/docs.mjs
```

Not a `package.json` script on purpose: the scripts block is hashed into the
expo runtime fingerprint, so adding one would force every installed build to be
rebuilt before it could take another OTA update. `KEEP_HTML=1` leaves the
intermediate page next to the PDF, which is the only way to see what went into
it without a PDF renderer to hand.

## scan.py — reading the scanned handbooks

The handbook scans are mixed raster: a blurred JPEG 2000 background carrying
the paper, and a JBIG2 bitmap carrying the ink, attached as the background
image's soft mask. A PDF text layer exists but holds only headings — every
number inside a table is ink, so extracting text returns nothing usable.

`scan.py` pulls the JBIG2 mask out, decodes it with `jbig2dec`, inverts it and
writes one PNG per page. Those pages are sharp enough to read every digit.

    apt-get install -y jbig2dec
    pip install pypdf pillow
    python3 tools/scan.py <scan.pdf> <output dir> [firstPage lastPage]

Pages already written are skipped, so a long book can be done in stretches.
