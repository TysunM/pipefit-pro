// Renders the markdown in docs/ to PDF, the way the guide is meant to be read
// on paper or on a phone that is not running the app.
//
//   node tools/docs.mjs
//
// Deliberately not a package.json script: the scripts block is hashed into the
// expo runtime fingerprint, and adding one would force every installed build to
// be rebuilt before it could take another update.
//
// Chromium comes from PLAYWRIGHT_BROWSERS_PATH, the repo's own Playwright cache
// or the system, in that order. CHROME_PATH overrides all of it.

import { readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');

const JOBS = [
  { md: 'USER-GUIDE.md', pdf: 'PipeFit-Pro-User-Guide.pdf' },
  { md: 'QUICK-REFERENCE.md', pdf: 'PipeFit-Pro-Quick-Reference.pdf' },
];

/** Stands in for a code span while the other inline marks are applied. */
const HOLD = 'zZcodeZz';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Inline marks, on already escaped text. Code is pulled out first so it wins. */
function inline(s) {
  const code = [];
  let out = esc(s).replace(/`([^`]+)`/g, (_, c) => `${HOLD}${code.push(c) - 1}${HOLD}`);
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out.replace(new RegExp(`${HOLD}(\\d+)${HOLD}`, 'g'), (_, i) => `<code>${code[Number(i)]}</code>`);
}

const isRule = (l) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l) && l.includes('-');
const cells = (l) =>
  l
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());

function render(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const para = [];
  let i = 0;

  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      flush();
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      i++;
      out.push(`<pre>${esc(body.join('\n'))}</pre>`);
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      flush();
      out.push('<hr>');
      i++;
      continue;
    }

    // A table needs its header row and the dashed rule under it.
    if (line.trimStart().startsWith('|') && isRule(lines[i + 1] ?? '')) {
      flush();
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trimStart().startsWith('|')) rows.push(cells(lines[i++]));
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>` +
          rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('') +
          '</tbody></table>',
      );
      continue;
    }

    const li = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      flush();
      const ordered = /\d/.test(li[2]);
      const items = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (!m || /\d/.test(m[2]) !== ordered) break;
        const text = [m[3]];
        i++;
        // A wrapped item, indented under its own bullet.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s/.test(lines[i])) {
          text.push(lines[i++].trim());
        }
        items.push(text.join(' '));
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${tag}>`);
      continue;
    }

    if (line.startsWith('>')) {
      flush();
      const body = [];
      while (i < lines.length && lines[i].startsWith('>')) body.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(body.join(' '))}</blockquote>`);
      continue;
    }

    if (!line.trim()) {
      flush();
      i++;
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flush();
  return out.join('\n');
}

const CSS = `
  @page { size: A4; margin: 17mm 15mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 10.5pt/1.55 "Helvetica Neue", Helvetica, Arial, sans-serif; color: #16232B; margin: 0; }
  h1 { font-size: 26pt; letter-spacing: -0.6pt; margin: 0 0 6pt; line-height: 1.15; }
  h1 + p { color: #5C6B73; font-size: 11pt; }
  h2 { font-size: 15pt; letter-spacing: -0.3pt; margin: 22pt 0 7pt; padding-bottom: 4pt;
       border-bottom: 1.2pt solid #2B4552; break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 14pt 0 5pt; color: #2B4552; break-after: avoid; }
  p { margin: 0 0 7pt; }
  ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
  li { margin-bottom: 3pt; }
  hr { border: 0; border-top: 0.6pt solid #DDE2E5; margin: 16pt 0; }
  a { color: #0F6CBD; }
  code { font: 9.5pt/1.4 Menlo, Consolas, monospace; background: #F1F4F5; padding: 0.5pt 3pt;
         border-radius: 2.5pt; }
  pre { font: 10pt/1.6 Menlo, Consolas, monospace; background: #F7F8F9; border: 0.6pt solid #DDE2E5;
        border-left: 2.5pt solid #E8792B; border-radius: 3pt; padding: 8pt 10pt; margin: 0 0 9pt;
        white-space: pre-wrap; }
  blockquote { margin: 0 0 9pt; padding: 7pt 11pt; background: #FDF4E1; border-left: 2.5pt solid #E8792B;
               border-radius: 3pt; color: #6B5320; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 10pt; font-size: 9.5pt; }
  th, td { border: 0.6pt solid #DDE2E5; padding: 4pt 7pt; text-align: left; vertical-align: top; }
  th { background: #2B4552; color: #fff; font-weight: 700; letter-spacing: 0.2pt; }
  tbody tr:nth-child(even) { background: #F7F8F9; }
  h2, h3, table, pre, blockquote { break-inside: avoid; }
`;

function chromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(ROOT, 'node_modules', '.cache', 'ms-playwright')];
  for (const r of roots) {
    if (!r || !existsSync(r)) continue;
    for (const d of readdirSync(r)) {
      if (!d.startsWith('chromium')) continue;
      for (const exe of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = join(r, d, exe);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/chromium-browser']) {
    if (existsSync(p)) return p;
  }
  throw new Error('No Chromium found. Set CHROME_PATH to one.');
}

const exe = chromium();
for (const job of JOBS) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${job.md}</title><style>${CSS}</style></head><body>${render(
    readFileSync(join(DOCS, job.md), 'utf8'),
  )}</body></html>`;
  const tmp = join(DOCS, `.${job.md}.html`);
  writeFileSync(tmp, html);
  try {
    execFileSync(
      exe,
      ['--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${join(DOCS, job.pdf)}`, `file://${tmp}`],
      { stdio: 'ignore' },
    );
  } finally {
    // KEEP_HTML=1 leaves the intermediate page behind, which is the only way to
    // look at what went into the PDF without a PDF renderer to hand.
    if (!process.env.KEEP_HTML) rmSync(tmp, { force: true });
  }
  console.log(`${job.md} -> ${job.pdf}`);
}
