// The laser meter, connected
// --------------------------
// One meter at a time, held for the whole app: connect it once, and every
// length field on every screen offers its last reading. Over Web Bluetooth,
// so in Chrome — the web app — and not in the APK, which has no Bluetooth
// stack of its own and would need a new build to get one.
//
// Readings are kept in metres as they arrive and turned into the reader's
// units where they are shown. The decoding is calc/laser.ts.

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { BOSCH, LEICA, LaserBrand, boschDistance, hex, leicaDistance, leicaMetres, leicaTilt } from '../calc/laser';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type LaserReading = { metres: number; tilt: number | null; at: number };

export type LaserState = {
  /** Web Bluetooth is here: Chrome on Android or a desktop. */
  supported: boolean;
  status: 'off' | 'connecting' | 'on';
  brand: LaserBrand | null;
  name: string;
  /** Newest first, the last ten. */
  readings: LaserReading[];
  /** What went wrong, or what the meter needs, in words. */
  note: string | null;
  /** The last frame that did not read as a distance, for a model that differs. */
  raw: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearNote: () => void;
};

const Ctx = createContext<LaserState | null>(null);

const bluetooth = (): any => (Platform.OS === 'web' && typeof navigator !== 'undefined' ? (navigator as any).bluetooth : undefined);

export function LaserProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LaserState['status']>('off');
  const [brand, setBrand] = useState<LaserBrand | null>(null);
  const [name, setName] = useState('');
  const [readings, setReadings] = useState<LaserReading[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const device = useRef<any>(null);
  const tilt = useRef<number | null>(null);

  const add = useCallback((metres: number) => {
    setReadings((r) => [{ metres, tilt: tilt.current, at: Date.now() }, ...r].slice(0, 10));
    (navigator as any).vibrate?.(20);
  }, []);

  const disconnect = useCallback(() => {
    try {
      device.current?.gatt?.disconnect();
    } catch {
      // already gone
    }
  }, []);

  const connect = useCallback(async () => {
    const bt = bluetooth();
    if (!bt) return setNote('Laser meters connect in Chrome. Open the web app in Chrome to use one.');
    setNote(null);
    setRaw(null);
    let d: any;
    try {
      // Every nearby device is listed: meters name themselves differently by model and firmware.
      d = await bt.requestDevice({ acceptAllDevices: true, optionalServices: [LEICA.service, BOSCH.service] });
    } catch {
      return; // the chooser was closed
    }
    setStatus('connecting');
    try {
      device.current = d;
      d.addEventListener('gattserverdisconnected', () => {
        setStatus('off');
        setBrand(null);
      });
      const server = await d.gatt.connect();
      const leica = await server.getPrimaryService(LEICA.service).catch(() => null);
      if (leica) {
        const unit = await leica.getCharacteristic(LEICA.distanceUnit).then((c: any) => c.readValue()).catch(() => null);
        if (unit && !leicaMetres(unit)) setNote('Set the DISTO to metres (Settings → Unit). The app shows every reading in your units anyway.');
        const dist = await leica.getCharacteristic(LEICA.distance);
        dist.addEventListener('characteristicvaluechanged', (e: any) => {
          const m = leicaDistance(e.target.value);
          if (m !== null) add(m);
          else setRaw(hex(e.target.value));
        });
        await dist.startNotifications();
        const angle = await leica.getCharacteristic(LEICA.angle).catch(() => null);
        if (angle) {
          angle.addEventListener('characteristicvaluechanged', (e: any) => (tilt.current = leicaTilt(e.target.value)));
          await angle.startNotifications().catch(() => undefined);
        }
        setBrand('leica');
      } else {
        const bosch = await server.getPrimaryService(BOSCH.service).catch(() => null);
        if (!bosch) throw new Error('This device is not a Leica DISTO or a Bosch GLM that this app can read.');
        const data = await bosch.getCharacteristic(BOSCH.data);
        data.addEventListener('characteristicvaluechanged', (e: any) => {
          const m = boschDistance(e.target.value);
          if (m !== null) add(m);
          else setRaw(hex(e.target.value));
        });
        await data.startNotifications();
        await data.writeValue(new Uint8Array(BOSCH.autosync));
        setBrand('bosch');
      }
      setName(d.name || 'Laser meter');
      setStatus('on');
    } catch (e) {
      setStatus('off');
      try {
        d?.gatt?.disconnect();
      } catch {
        // nothing to close
      }
      setNote(e instanceof Error && e.message ? e.message : 'The meter would not connect. Turn its Bluetooth on and try again.');
    }
  }, [add]);

  const value = useMemo<LaserState>(
    () => ({ supported: !!bluetooth(), status, brand, name, readings, note, raw, connect, disconnect, clearNote: () => setNote(null) }),
    [status, brand, name, readings, note, raw, connect, disconnect],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLaser(): LaserState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLaser must be used inside LaserProvider');
  return c;
}

/** The reading a field may take: the newest, while the meter is on and it is under ten minutes old. */
export function freshReading(s: Pick<LaserState, 'status' | 'readings'>, now = Date.now()): LaserReading | null {
  const r = s.readings[0];
  return s.status === 'on' && r && now - r.at < 10 * 60_000 ? r : null;
}
