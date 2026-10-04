// AR capture, in the browser
// --------------------------
// WebXR in Chrome on an Android phone with Google Play Services for AR: the
// camera fills the screen, a ring sits where the centre of the screen meets a
// surface, and "Mark" drops a point there. Each mark after the first is drawn
// back to the one before with its length, and the ring carries a live
// distance from the last mark, so the route is traced the way a tape is run.
//
// Nothing is drawn with WebGL. The browser composites the camera itself; the
// ring, the marks and the lines are an SVG in the DOM overlay, placed each
// frame by projecting the world points through the camera (calc/spatial.ts).
// The GL layer exists only because WebXR will not run a session without one.
//
// The whole session is driven from refs, not React state: it runs at the
// camera's frame rate, and React is only told when the count of marks or the
// status line changes.

import React, { useEffect, useRef, useState } from 'react';
import { V3, leg, project } from '../calc/spatial';
import type { ArCaptureProps } from './arTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Support = 'checking' | 'ok' | 'no-xr' | 'no-ar' | 'insecure';

async function arSupport(): Promise<Support> {
  if (typeof window === 'undefined') return 'no-xr';
  if (!window.isSecureContext) return 'insecure';
  const xr = (navigator as any).xr;
  if (!xr?.isSessionSupported) return 'no-xr';
  try {
    return (await xr.isSessionSupported('immersive-ar')) ? 'ok' : 'no-ar';
  } catch {
    return 'no-ar';
  }
}

const SUPPORT_WORDS: Record<Exclude<Support, 'checking' | 'ok'>, string> = {
  'no-xr': 'This browser has no AR. Open this page in Chrome on an Android phone.',
  'no-ar': 'Chrome here cannot start AR. Install or update “Google Play Services for AR” from the Play Store, then reload.',
  insecure: 'AR only runs on the secure (https) address of the app.',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const ORANGE = '#F58220';

export function ArCapture({ onDone, format }: ArCaptureProps) {
  const [support, setSupport] = useState<Support>('checking');
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('Move the phone slowly over the surface until the ring appears.');
  const [error, setError] = useState<string | null>(null);

  const overlay = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const session = useRef<any>(null);
  const points = useRef<V3[]>([]);
  const hit = useRef<V3 | null>(null);
  const fmt = useRef(format);
  fmt.current = format;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    void arSupport().then(setSupport);
    // A tap on the overlay's buttons is not also an AR "select".
    const root = overlay.current;
    const keep = (e: Event) => e.preventDefault();
    root?.addEventListener('beforexrselect', keep);
    return () => {
      root?.removeEventListener('beforexrselect', keep);
      void session.current?.end().catch(() => undefined);
    };
  }, []);

  /** Redraw the overlay: the ring, the marks, the lines and their lengths. */
  const draw = (projection: ArrayLike<number>, view: ArrayLike<number>) => {
    const el = svg.current;
    if (!el) return;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    const at = (p: V3) => project(p, projection, view, w, h);
    const parts: string[] = [];
    const label = (x: number, y: number, text: string) =>
      `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="700" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">${text}</text>`;
    const pts = points.current;
    for (let i = 1; i < pts.length; i++) {
      const a = at(pts[i - 1]!);
      const b = at(pts[i]!);
      if (!a || !b) continue;
      parts.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#fff" stroke-width="3"/>`);
      parts.push(label((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 8, fmt.current(leg(pts[i - 1]!, pts[i]!).length)));
    }
    for (const p of pts) {
      const s = at(p);
      if (s) parts.push(`<circle cx="${s[0]}" cy="${s[1]}" r="7" fill="${ORANGE}" stroke="#fff" stroke-width="2"/>`);
    }
    const ring = hit.current ? at(hit.current) : null;
    if (ring) {
      const last = pts[pts.length - 1];
      const l = last ? at(last) : null;
      if (last && l) {
        parts.push(`<line x1="${l[0]}" y1="${l[1]}" x2="${ring[0]}" y2="${ring[1]}" stroke="${ORANGE}" stroke-width="2" stroke-dasharray="6 5"/>`);
        const g = leg(last, hit.current!);
        parts.push(label(ring[0], ring[1] - 30, `${fmt.current(g.length)} · ${Math.abs(g.slope).toFixed(1)}°`));
      }
      parts.push(`<circle cx="${ring[0]}" cy="${ring[1]}" r="18" fill="none" stroke="#fff" stroke-width="3"/>`);
      parts.push(`<circle cx="${ring[0]}" cy="${ring[1]}" r="3" fill="#fff"/>`);
    }
    el.innerHTML = parts.join('');
  };

  const start = async () => {
    setError(null);
    const xr = (navigator as any).xr;
    const root = overlay.current;
    if (!xr || !root) return;
    root.style.display = 'block';
    try {
      const s = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root },
      });
      session.current = s;
      points.current = [];
      hit.current = null;
      setCount(0);
      setRunning(true);

      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl', { xrCompatible: true } as any) as WebGLRenderingContext;
      await (gl as any).makeXRCompatible?.();
      s.updateRenderState({ baseLayer: new (window as any).XRWebGLLayer(s, gl) });
      const local = await s.requestReferenceSpace('local');
      const viewer = await s.requestReferenceSpace('viewer');
      const source = await s.requestHitTestSource({ space: viewer });

      let found = false;
      const frame = (_t: number, f: any) => {
        s.requestAnimationFrame(frame);
        const layer = s.renderState.baseLayer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const pose = f.getViewerPose(local);
        if (!pose) return;
        const hits = f.getHitTestResults(source);
        const hp = hits[0]?.getPose(local)?.transform.position;
        hit.current = hp ? [hp.x, hp.y, hp.z] : null;
        if (!!hit.current !== found) {
          found = !!hit.current;
          setStatus(found ? 'Put the ring on the first point and tap Mark.' : 'Lost the surface. Move slowly, closer to something with texture.');
        }
        const v = pose.views[0];
        if (v) draw(v.projectionMatrix, v.transform.inverse.matrix);
      };
      s.requestAnimationFrame(frame);
      s.addEventListener('end', () => {
        source.cancel?.();
        session.current = null;
        root.style.display = 'none';
        setRunning(false);
        done.current(points.current.slice());
      });
    } catch (e) {
      root.style.display = 'none';
      setRunning(false);
      setError(e instanceof Error && e.message ? `AR would not start: ${e.message}` : 'AR would not start.');
    }
  };

  const mark = () => {
    if (!hit.current) return;
    points.current = [...points.current, hit.current];
    setCount(points.current.length);
    setStatus(points.current.length === 1 ? 'Now the next point. Same face of the pipe each time: top, or side.' : 'Keep going, or tap Done.');
    (navigator as any).vibrate?.(15);
  };
  const undo = () => {
    points.current = points.current.slice(0, -1);
    setCount(points.current.length);
  };

  const button = (label: string, onClick: () => void, strong = false, disabled = false): React.ReactElement => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: strong ? 2 : 1,
        height: 60,
        borderRadius: 12,
        border: strong ? 'none' : '1px solid rgba(255,255,255,0.6)',
        background: strong ? ORANGE : 'rgba(20,24,30,0.72)',
        color: strong ? '#1A1A1A' : '#fff',
        fontSize: 18,
        fontWeight: 700,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {support === 'ok' ? (
        <button
          onClick={() => void start()}
          disabled={running}
          style={{ width: '100%', height: 58, borderRadius: 10, border: 'none', background: ORANGE, color: '#1A1A1A', fontSize: 17, fontWeight: 700 }}
        >
          Start measuring
        </button>
      ) : (
        <p style={{ margin: 0, padding: 14, borderRadius: 10, border: '1px solid #B7791F', color: '#B7791F', fontFamily: 'sans-serif', fontSize: 15, lineHeight: 1.4 }}>
          {support === 'checking' ? 'Checking this browser for AR…' : SUPPORT_WORDS[support]}
        </p>
      )}
      {error ? <p style={{ color: '#E5484D', fontFamily: 'sans-serif', fontSize: 14 }}>{error}</p> : null}

      {/* The DOM overlay: shown over the camera while the session runs. */}
      <div
        ref={overlay}
        style={{ display: 'none', position: 'fixed', inset: 0, fontFamily: 'sans-serif' }}
      >
        <svg ref={svg} xmlns={SVG_NS} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 16px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 16, lineHeight: 1.35 }}>
          <strong>{count ? `${count} point${count === 1 ? '' : 's'} marked` : 'AR measure'}</strong>
          <div>{status}</div>
        </div>
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 28, display: 'flex', gap: 10 }}>
          {button('Undo', undo, false, count === 0)}
          {button('Mark', mark, true)}
          {button('Done', () => void session.current?.end())}
        </div>
      </div>
    </div>
  );
}
