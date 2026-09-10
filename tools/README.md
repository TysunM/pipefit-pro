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
