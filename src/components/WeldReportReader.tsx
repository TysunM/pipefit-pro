import React, { useEffect, useRef } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { API_BASE } from '../ai/apiBase';
import { askWeldReport, reportMissWords, type WeldReportRead } from '../ai/weldReport';
import { checkReport } from '../calc/orbitalReport';
import type { ProgramBody } from '../state/orbitalBook';
import { useWpsBook } from '../state/heatInputs';
import { say } from '../audio/say';
import { PhotoReader, SheetButton, type ReviewControls } from './PhotoReader';
import { ReportTable } from './orbital/ReportTable';

// The power supply's report of a weld, photographed and read
// (ai/weldReport.ts), set against the weld's program (calc/orbitalReport.ts)
// and kept on the weld's run sheet only when the fitter keeps it.

export function WeldReportReader({
  visible,
  onClose,
  program,
  onKeep,
  listen = false,
}: {
  visible: boolean;
  onClose: () => void;
  program: ProgramBody;
  onKeep: (report: WeldReportRead) => void;
  listen?: boolean;
}) {
  return (
    <PhotoReader<WeldReportRead>
      visible={visible}
      onClose={onClose}
      listen={listen}
      title="Read the weld report"
      shootLabel="Read the report"
      frame="The power supply's printout or its screen, every level in the frame, square on. A long printout goes in halves."
      readingNote="Reading it. A full report takes up to a minute."
      read={async (b64) => {
        const r = await askWeldReport(API_BASE, b64);
        return typeof r === 'string' ? { miss: reportMissWords(r) } : r;
      }}
      review={(report, _uri, controls) => <ReportReview report={report} program={program} controls={controls} onKeep={onKeep} />}
    />
  );
}

function ReportReview({ report, program, controls, onKeep }: { report: WeldReportRead; program: ProgramBody; controls: ReviewControls; onKeep: (r: WeldReportRead) => void }) {
  const t = useTheme();
  const { book } = useWpsBook();
  const check = checkReport(report, program, book.wps);
  const keep = () => {
    onKeep(report);
    if (controls.listen) say('Report kept on the weld.');
    controls.close();
  };
  const latest = useRef(keep);
  latest.current = keep;
  useEffect(() => {
    controls.onSave(report.levels.length || report.faults.length ? () => latest.current() : null);
    if (controls.listen) say(`${report.levels.length} level${report.levels.length === 1 ? '' : 's'} read${check.notes.length ? `, ${check.notes.length} thing${check.notes.length === 1 ? '' : 's'} to look at` : ', all within the program'}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const empty = !report.levels.length && !report.faults.length;
  return (
    <>
      {report.unread ? <Text style={[t.type.caption, { color: t.colors.warnText }]}>{report.unread}</Text> : null}
      {empty ? (
        <Text style={[t.type.body, { color: t.colors.warnText }]}>Nothing on that picture read as a weld report. Closer and square to the printout reads better.</Text>
      ) : (
        <>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>Check the figures against the printout before you keep it.</Text>
          <ReportTable report={report} check={check} />
          <SheetButton label="Keep it on this weld" icon="bookmark-outline" onPress={keep} primary />
        </>
      )}
      <SheetButton label="Take it again" icon="camera-outline" onPress={controls.retake} />
    </>
  );
}
