import sys, types, os, subprocess, tempfile
for m in ['cryptography','cryptography.exceptions','cryptography.hazmat','cryptography.hazmat.primitives','cryptography.hazmat.primitives.ciphers','cryptography.hazmat.primitives.ciphers.algorithms','cryptography.hazmat.primitives.ciphers.modes','cryptography.hazmat.primitives.padding','cryptography.hazmat.backends']:
    sys.modules[m]=types.ModuleType(m)
class UA(Exception): pass
sys.modules['cryptography.exceptions'].UnsupportedAlgorithm=UA
from pypdf import PdfReader
from PIL import Image, ImageOps

src, outdir = sys.argv[1], sys.argv[2]
first, last = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (1, 10**6)
os.makedirs(outdir, exist_ok=True)
r = PdfReader(src)
ok = 0

for i, p in enumerate(r.pages):
    if not (first <= i+1 <= last):
        continue
    out = '%s/p%03d.png' % (outdir, i+1)
    if os.path.exists(out):
        ok += 1; continue
    try:
        xo = p['/Resources']['/XObject']
    except Exception:
        continue
    best = None
    for k in xo:
        o = xo[k].get_object()
        if o.get('/Subtype') != '/Image' or '/SMask' not in o:
            continue
        sm = o['/SMask'].get_object()
        if '/JBIG2Decode' not in str(sm.get('/Filter')):
            continue
        area = int(sm.get('/Width', 0)) * int(sm.get('/Height', 0))
        if best is None or area > best[0]:
            best = (area, sm)
    if best is None:
        continue
    sm = best[1]
    raw = sm._data
    glob = b''
    dp = sm.get('/DecodeParms')
    if dp is not None:
        dp = dp.get_object()
        if isinstance(dp, list):
            dp = dp[0].get_object() if dp else None
        if dp and '/JBIG2Globals' in dp:
            glob = dp['/JBIG2Globals'].get_object()._data
    with tempfile.TemporaryDirectory() as td:
        gp = os.path.join(td, 'g.jbig2'); pp = os.path.join(td, 'p.jbig2')
        op = os.path.join(td, 'o.png')
        open(gp, 'wb').write(glob); open(pp, 'wb').write(raw)
        cmd = ['jbig2dec', '-e', '-t', 'png', '-o', op] + ([gp] if glob else []) + [pp]
        res = subprocess.run(cmd, capture_output=True)
        if not os.path.exists(op):
            print('p%d jbig2dec: %s' % (i+1, res.stderr.decode()[:90])); continue
        im = Image.open(op); im.load()
    im = ImageOps.invert(im.convert('L'))
    w, h = im.size
    if w < 1500:
        im = im.resize((1500, int(h*1500/w)), Image.LANCZOS)
    im.save(out, 'PNG', optimize=True)
    ok += 1
print('written', ok)
