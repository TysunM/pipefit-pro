// The shift report, on paper
// --------------------------
// The report is text, built in calc/shiftReport.ts and edited by the crew. On
// paper it is the same words: a line in capitals is a heading, a line that
// starts with a bullet is a list item, anything else a paragraph. Reading the
// text back rather than laying out the facts again means what prints is what
// was read and edited on the screen, word for word.

import { CSS } from './sheet';
import { esc } from './spoolSvg';

const HEADING = /^[A-Z][A-Z /·&-]{2,}$/;

/** The report's lines as HTML blocks. */
export function reportBody(text: string): string {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(`<ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`);
    list = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith('• ') || line.startsWith('- ')) {
      list.push(line.slice(2).trim());
      continue;
    }
    flush();
    if (HEADING.test(line)) out.push(`<h2>${esc(line)}</h2>`);
    else out.push(`<p>${esc(line)}</p>`);
  }
  flush();
  return out.join('');
}

export function shiftSheetHtml(i: { title: string; text: string; dateLine: string; polished: boolean }): string {
  const lines = i.text.split('\n');
  // The first two lines are the title and the date line; the body is the rest.
  const [first = '', second = '', ...rest] = lines;
  const body = reportBody(rest.join('\n'));
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(i.title)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}${EXTRA}</style></head><body>` +
    '<header><div class="titles"><div>' +
    `<h1>${esc(first.replace(/^SHIFT REPORT\s*·\s*/, 'Shift report · '))}</h1>` +
    `<p class="where">${esc(second)}</p>` +
    `</div><div class="when">${esc(i.dateLine)}</div></div></header>` +
    `<main>${body}</main>` +
    `<footer>${esc(i.polished ? FOOTER_POLISHED : FOOTER)}</footer>` +
    '</body></html>'
  );
}

const FOOTER = 'Made by PipeFit Pro from the records on the phone that kept them. Every figure is as logged on the day; the summary and the notes are the crew’s.';
const FOOTER_POLISHED =
  'Made by PipeFit Pro from the records on the phone that kept them. Every figure is as logged on the day. The summary and the notes were drafted by Claude from those records and the crew’s notes, checked by the app against the records, and read and edited by the crew before sending.';

const EXTRA = `
  main { font-size: 10pt; }
  main h2 { margin: 9pt 0 2pt; }
  main p { margin: 0 0 4pt; }
  main ul { margin: 0 0 4pt; padding-left: 14pt; }
  main li { margin: 0 0 1.5pt; }
`;
