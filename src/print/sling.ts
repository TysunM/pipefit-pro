// The sling check on paper: what went in, what each leg carries, the warnings
// and the angle factors, to go with the lift's paperwork. Not a lift plan.

import { CSS, table } from './sheet';
import { esc } from './spoolSvg';
import { FACTORS } from '../calc/sling';

export function slingHtml(o: { when: string; inputs: string[][]; results: string[][]; warnings: string[]; angle: number | null }): string {
  const near = o.angle === null ? null : FACTORS.reduce((b, f) => (Math.abs(f.angle - o.angle!) < Math.abs(b.angle - o.angle!) ? f : b));
  const body =
    table({ title: 'The lift', head: ['', ''], rows: o.inputs }) +
    table({ title: 'Each leg', head: ['', ''], rows: o.results }) +
    table({ title: 'Angle factors (from horizontal)', head: ['Angle', 'Factor', ''], rows: FACTORS.map((f) => [`${f.angle}°`, f.factor.toFixed(3), f === near ? '◀ nearest' : f.angle < 45 ? (f.angle === 30 ? 'least that is used' : '') : '']) });
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>Sling angle check</title>' +
    `<style>${CSS}</style></head><body>` +
    `<header><div class="titles"><div><h1>Sling angle check</h1><p class="where">Leg tension from the load, the legs and their angle</p></div><div class="when">${esc(o.when)}</div></div>` +
    (o.warnings.length ? `<p class="problem">${o.warnings.map(esc).join('<br>')}</p>` : '') +
    '</header>' +
    `<main>${body}</main>` +
    '<footer>Forces, not a lift plan. The lift is planned and the rigging chosen by a qualified person, to the load&#39;s weight and the slings&#39; tags. Choker and basket ratings, D/d and edge protection are on the tag and from the maker. Under 30° from horizontal, a sling is not used unless its maker or a qualified person says so (ASME B30.9).</footer>' +
    '</body></html>'
  );
}
