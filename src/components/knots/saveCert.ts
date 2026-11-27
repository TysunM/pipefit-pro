// Saving the certificate as a picture
// -----------------------------------
// On the phone: the picture drawn with react-native-svg is turned into a PNG
// (Svg's toDataURL), written to the app's cache and handed to the share sheet,
// which can save it to the photos or send it to the crew's chat. In the
// browser: drawn on a canvas (with the page's own fonts) and handed to the
// share sheet where the browser has one, or downloaded. All with what the app
// already carries: no new build. Best effort, so nothing throws.

import { Platform } from 'react-native';
import type Svg from 'react-native-svg';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { Art, Prim } from './certArt';
import type { Fonts } from './CertArtSvg';

export type SaveOutcome = { ok: true; how: 'shared' | 'downloaded' } | { ok: false; why: string };
export const CERT_FILE = 'knot-certified.png';

/** The picture drawn on a canvas, letter by letter where it is spaced out, so it matches the phone's. */
export function drawOnCanvas(ctx: CanvasRenderingContext2D, art: Art, fonts: Fonts) {
  const draw = (p: Prim) => {
    ctx.save();
    switch (p.k) {
      case 'rect':
      case 'circle': {
        ctx.beginPath();
        if (p.k === 'rect') {
          if (p.rx > 0 && 'roundRect' in ctx) ctx.roundRect(p.x, p.y, p.w, p.h, p.rx);
          else ctx.rect(p.x, p.y, p.w, p.h);
        } else ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        if (p.fill) {
          ctx.fillStyle = p.fill;
          ctx.fill();
        }
        if (p.stroke && p.sw) {
          ctx.setLineDash(p.dash ?? []);
          ctx.strokeStyle = p.stroke;
          ctx.lineWidth = p.sw;
          ctx.stroke();
        }
        break;
      }
      case 'line':
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = p.sw;
        ctx.stroke();
        break;
      case 'text': {
        ctx.font = `${p.size}px "${fonts[p.face]}"`;
        ctx.fillStyle = p.color;
        ctx.textBaseline = 'alphabetic';
        const chars = [...p.text];
        const sp = p.spacing ?? 0;
        const widths = chars.map((ch) => ctx.measureText(ch).width);
        const total = widths.reduce((a, w) => a + w, 0) + sp * Math.max(0, chars.length - 1);
        let x = p.anchor === 'middle' ? p.x - total / 2 : p.anchor === 'end' ? p.x - total : p.x;
        chars.forEach((ch, i) => {
          ctx.fillText(ch, x, p.y);
          x += widths[i]! + sp;
        });
        break;
      }
      case 'group':
        ctx.translate(p.cx, p.cy);
        ctx.rotate((p.rotate * Math.PI) / 180);
        ctx.translate(-p.cx, -p.cy);
        p.children.forEach(draw);
        break;
    }
    ctx.restore();
  };
  art.prims.forEach(draw);
}

async function saveInBrowser(art: Art, fonts: Fonts): Promise<SaveOutcome> {
  const canvas = document.createElement('canvas');
  canvas.width = art.w;
  canvas.height = art.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, why: 'This browser cannot draw the picture.' };
  // The page's fonts, loaded before a letter is drawn.
  const docFonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (docFonts) await Promise.all(Object.values(fonts).map((f) => docFonts.load(`40px "${f}"`).catch(() => undefined)));
  drawOnCanvas(ctx, art, fonts);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return { ok: false, why: 'The picture could not be made.' };
  const file = new globalThis.File([blob], CERT_FILE, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: globalThis.File[] }) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: 'Knot Certified' } as ShareData);
      return { ok: true, how: 'shared' };
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return { ok: false, why: 'Not shared.' };
      // Fall through to a download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = CERT_FILE;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { ok: true, how: 'downloaded' };
}

async function saveOnPhone(art: Art, svg: Svg | null): Promise<SaveOutcome> {
  if (!svg) return { ok: false, why: 'The picture is not ready yet. Try again in a moment.' };
  const base64 = await new Promise<string>((res) => svg.toDataURL((b) => res(b), { width: art.w, height: art.h }));
  if (!base64) return { ok: false, why: 'The picture could not be made.' };
  const file = new File(Paths.cache, CERT_FILE);
  file.create({ overwrite: true });
  file.write(base64.replace(/^data:image\/png;base64,/, ''), { encoding: 'base64' });
  if (!(await Sharing.isAvailableAsync())) return { ok: false, why: 'This phone has nothing to share the picture to.' };
  await Sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Save or send your certificate' });
  return { ok: true, how: 'shared' };
}

/** The certificate as a PNG: the share sheet on the phone (save to photos, or send it), a share or a download in the browser. */
export async function saveCertificate(art: Art, fonts: Fonts, svg: Svg | null): Promise<SaveOutcome> {
  try {
    return Platform.OS === 'web' ? await saveInBrowser(art, fonts) : await saveOnPhone(art, svg);
  } catch (e) {
    return { ok: false, why: e instanceof Error && e.message ? e.message : 'The picture could not be saved.' };
  }
}
