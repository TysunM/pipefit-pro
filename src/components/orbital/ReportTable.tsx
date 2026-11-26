import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { REPORT_OFF_PCT, type Cmp, type ReportCheck } from '../../calc/orbitalReport';
import type { WeldReportRead } from '../../ai/weldReport';
import { levelInk } from './WeldClock';

// A weld report set against its program, level by level: what the power
// supply says beside what the program says, a difference past 5% in the
// warning colour, the heat input it put in and whether that sits in the
// WPS, then anything worth a look in plain words.

const fmt = (v: number | null | undefined, places = 0) => (v === null || v === undefined ? '—' : v.toFixed(places));
/** Amps as the report prints them: a whole number whole, a half amp with its decimal. */
const amps = (v: number, places: number) => (places === 0 && !Number.isInteger(v) ? v.toFixed(1) : v.toFixed(places));

export function ReportTable({ report, check }: { report: WeldReportRead; check: ReportCheck }) {
  const t = useTheme();
  const c = t.colors;
  const head = [report.program && `Program ${report.program}`, report.weldNo && `weld ${report.weldNo}`, [report.date, report.time].filter(Boolean).join(' '), report.operator, report.machine].filter(Boolean).join(' · ');
  const set = report.figures === 'programmed';
  const cell = (x: Cmp | null, places = 0) => (
    <View style={{ flex: 1.2 }}>
      <Text style={[t.type.captionStrong, { color: x?.off ? c.warnText : c.text }]}>{x ? amps(x.read, places) : '—'}</Text>
      {x ? <Text style={[t.type.caption, { color: x.off ? c.warnText : c.textFaint, fontSize: 11 }]}>{`${amps(x.program, places)} ${Math.abs(x.pct) < 0.5 ? '=' : `${x.pct > 0 ? '+' : ''}${x.pct.toFixed(0)}%`}`}</Text> : null}
    </View>
  );
  return (
    <View style={{ gap: t.space.sm }}>
      {head ? <Text style={[t.type.caption, { color: c.textMuted }]}>{head}</Text> : null}
      <Text style={[t.type.caption, { color: c.textFaint }]}>
        {`${set ? "The power supply's set figures" : report.figures === 'actual' ? 'As welded' : 'As the report prints them'}, each over the program's; past ${REPORT_OFF_PCT}% in amber.`}
      </Text>
      <View>
        <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
          {['', 'Peak A', 'Bkg A', 'RPM', 'V', 'J/in'].map((h, i) => (
            <Text key={i} style={[t.type.labelSmall, { color: c.textFaint, flex: i === 0 ? 0.6 : 1.2 }]}>
              {h}
            </Text>
          ))}
        </View>
        {check.levels.map((l) => (
          <View key={`${l.level}-${l.index}`} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, borderTopWidth: t.hairline, borderTopColor: c.border }}>
            <Text style={[t.type.captionStrong, { color: l.index !== null ? levelInk(t, l.index) : c.textMuted, flex: 0.6 }]}>{`L${l.level}`}</Text>
            {cell(l.ip)}
            {cell(l.ib)}
            {cell(l.rpm, 1)}
            <Text style={[t.type.captionStrong, { color: c.text, flex: 1.2 }]}>{fmt(l.volts, 1)}</Text>
            <View style={{ flex: 1.2 }}>
              <Text style={[t.type.captionStrong, { color: l.wps === 'low' || l.wps === 'high' ? c.danger : c.text }]}>{fmt(l.heat)}</Text>
              {l.wps ? <Text style={[t.type.caption, { color: l.wps === 'in' ? c.success : c.danger, fontSize: 11 }]}>{l.wps === 'in' ? 'in WPS' : l.wps === 'low' ? 'under WPS' : 'over WPS'}</Text> : null}
            </View>
          </View>
        ))}
      </View>
      {check.notes.length ? (
        <View style={{ padding: t.space.md, borderRadius: t.radius.lg, backgroundColor: c.warnBg, borderWidth: t.hairline, borderColor: c.warnBorder, gap: 4 }}>
          {check.notes.map((n) => (
            <Text key={n} style={[t.type.caption, { color: c.text }]}>{`• ${n}`}</Text>
          ))}
        </View>
      ) : check.levels.length ? (
        <Text style={[t.type.caption, { color: c.success }]}>{`Every level ${set ? 'is set' : 'ran'} within ${REPORT_OFF_PCT}% of the program${check.wps && check.levels.some((l) => l.wps) ? `, and in ${check.wps.name}'s heat input` : ''}.`}</Text>
      ) : null}
      {check.wps === null && check.levels.some((l) => l.heat !== null) ? (
        <Text style={[t.type.caption, { color: c.textFaint }]}>Name the program's WPS, and enter its heat input window in the WPS book, to check the heat input against it.</Text>
      ) : null}
    </View>
  );
}
