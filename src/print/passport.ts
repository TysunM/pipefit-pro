// The skills passport, on paper
// -----------------------------
// What a hand hands a new foreman or a training office: who they are, where
// each skill stands, the sign-offs with the signatures and their record
// codes, and the work behind each skill. Black on white, the same page as the
// other sheets, so it prints on whatever is in the site office.

import { AREAS, AREA_TITLES, STANDING_WORDS, recordCode, type SkillStanding } from '../state/passport';
import { dayKey, usDate } from '../calc/days';
import { sigSvg } from '../calc/signature';
import { CSS, table } from './sheet';
import { esc } from './spoolSvg';

const CSS_MORE = `
  .sig { display: flex; align-items: center; gap: 6pt; }
  .sig svg { width: 60pt; height: 20pt; }
  .sig td { vertical-align: middle; }
`;

const when = (at: number) => usDate(dayKey(at));

export function passportHtml(i: { holder: string; standings: readonly SkillStanding[]; today: string }): string {
  const name = i.holder.trim() || 'Name not set';
  const signed = i.standings.filter((s) => s.standing === 'competent').length;
  const parts: string[] = [];
  for (const area of AREAS) {
    const xs = i.standings.filter((s) => s.skill.area === area);
    if (!xs.length) continue;
    parts.push(
      table({
        title: AREA_TITLES[area],
        head: ['Skill', 'NCCER module', 'Level', 'Standing', 'Records', 'First', 'Latest', 'Signed off by'],
        right: [2, 4],
        rows: xs.map((s) => {
          const last = s.evidence[0];
          const first = s.evidence[s.evidence.length - 1];
          const a = s.attestations[0];
          return [
            s.skill.title,
            s.skill.nccer,
            String(s.skill.level),
            STANDING_WORDS[s.standing],
            s.skill.needs ? `${s.evidence.length} of ${s.skill.needs}` : '—',
            first ? when(first.at) : '—',
            last ? when(last.at) : '—',
            a ? `${a.by}, ${a.role}, ${when(a.at)}` : '—',
          ];
        }),
      }),
    );
  }
  const attestations = i.standings.flatMap((s) => s.attestations.map((a) => ({ a, s }))).sort((x, y) => y.a.at - x.a.at);
  const signRows = attestations
    .map(
      ({ a, s }) =>
        `<tr><td>${esc(s.skill.title)}</td><td>${esc(a.by)}</td><td>${esc(a.role)}</td><td>${esc(when(a.at))}</td><td>${esc(a.project || '—')}</td>` +
        `<td class="sig">${sigSvg(a.sig)}</td><td>${esc(recordCode(a, name))}</td><td>${esc(a.note || '')}</td></tr>`,
    )
    .join('');
  const signTable = attestations.length
    ? `<section class="tbl"><h2>Sign-offs</h2><table><thead><tr><th>Skill</th><th>Signed by</th><th>Role</th><th>Date</th><th>Job</th><th>Signature</th><th>Record code</th><th>Note</th></tr></thead><tbody>${signRows}</tbody></table>` +
      '<p class="note">A record code is worked from the sign-off as it is held on the phone. The same sign-off opened on the phone shows the same code.</p></section>'
    : '';
  const orient = i.standings.find((s) => s.skill.id === 'orientation');
  const orientTable = orient?.evidence.length
    ? table({ title: 'Site orientation passed', head: ['Module', 'Date', 'Job'], rows: orient.evidence.map((e) => [e.what, when(e.at), e.project || '—']) })
    : '';
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(`Skills passport — ${name}`)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}${CSS_MORE}</style></head><body>` +
    `<header><div class="titles"><div><h1>${esc(`Skills passport — ${name}`)}</h1>` +
    `<p class="where">${esc(`${signed} of ${i.standings.length} skills signed off · ${attestations.length} sign-offs`)}</p></div>` +
    `<div class="when">${esc(usDate(i.today))}</div></div></header>` +
    `<main>${parts.join('')}${orientTable}${signTable}</main>` +
    '<footer>Made by PipeFit Pro from the records and sign-offs on the holder\'s phone. Records are the work saved in the app; a sign-off is the signed word of the person named. Module titles follow the NCCER Pipefitting curriculum; numbering varies by edition.</footer>' +
    '</body></html>'
  );
}
