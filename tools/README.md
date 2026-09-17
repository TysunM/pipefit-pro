# tools

`icons.mjs` renders every launcher asset in `assets/` from the vector mark in
`mark.js`, using the Chromium that Playwright installs.

```
node tools/icons.mjs
```

Outputs, all regenerated from one source so they never drift apart:

| File | Size | Notes |
| --- | --- | --- |
| `icon.png` | 1024 | Full-bleed launcher icon on the gradient ground |
| `adaptive-icon.png` | 1024 | Android foreground, transparent, scaled to 62% for the mask safe zone |
| `splash-icon.png` | 1024 | Splash mark, transparent |
| `favicon.png` | 64 | Web |

Edit `mark.js` and re-run. Android masks the adaptive foreground to roughly the
inner two thirds, so anything drawn outside that scale gets cut off on a
launcher — keep `adaptive-icon.png` at or below 0.62.

## docs.mjs — the guide as a PDF

Renders `docs/*.md` to the PDFs beside them, through the same Chromium
`icons.mjs` uses.

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
