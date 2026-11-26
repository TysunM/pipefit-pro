// QC signing
// ----------
// A program code says what it is; a signed one also says who sent it. The QC
// phone holds a signing key (Ed25519) and signs every program it shares. A
// crew phone trusts a QC once, after checking the key on its screen matches
// the one on the QC's phone, and from then on knows a program came from that
// QC and was not changed on the way: a qualified program that is not signed
// by a QC it trusts is not taken.
//
// The key never leaves the QC phone: it is not in a backup or a code. Lose
// that phone and the QC makes a new key; the crew's phones say the key has
// changed and trust the new one only once it is checked the same way.
//
// A crew phone keeps the signed code each program came in on, so it can pass
// the program on to another crew phone with the QC's signature intact.

import nacl from 'tweetnacl';

export const SIGNING_VERSION = 1;
export const MAX_QC_NAME = 60;
export const MAX_QCS = 20;
export const MAX_COPIES = 100;
const MAX_COPY = 12_000;
const MAX_ID = 120;

export type Signer = { name: string; seed: string; key: string; createdAt: number };
export type TrustedQc = { key: string; name: string; trustedAt: number };
export type SignedCopy = { id: string; code: string; at: number };
export type SigningBook = { signer: Signer | null; qcs: TrustedQc[]; copies: SignedCopy[]; foreign: boolean; dropped: number };

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// ------------------------------------------------------------ bytes

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Bytes as URL-safe base64 with no padding: safe in a QR, a text message or JSON. */
export function toB64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i]! << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
    if (i + 1 < b.length) s += B64[(n >> 6) & 63]!;
    if (i + 2 < b.length) s += B64[n & 63]!;
  }
  return s;
}

export function fromB64(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let bits = 0;
  let acc = 0;
  let o = 0;
  for (const ch of s) {
    acc = (acc << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 255;
    }
  }
  return out;
}

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 255);

/**
 * Fresh random bytes from the phone's secure generator, or null when it has
 * none: a key from anything weaker would be a key someone could guess.
 * The browser has crypto.getRandomValues. The app has Expo's native UUID,
 * Java's UUID.randomUUID() behind it: SecureRandom, 122 random bits a UUID,
 * enough of them run through SHA-512.
 */
export function randomBytes(n: number): Uint8Array | null {
  if (n < 1 || n > 64) return null;
  const g = globalThis as { crypto?: { getRandomValues?: (b: Uint8Array) => Uint8Array }; expo?: { uuidv4?: () => string } };
  if (typeof g.crypto?.getRandomValues === 'function') {
    const b = new Uint8Array(n);
    g.crypto.getRandomValues(b);
    return b;
  }
  const uuid = g.expo?.uuidv4;
  if (typeof uuid !== 'function') return null;
  let hex = '';
  for (let i = 0; i < Math.ceil((n * 8) / 122) + 1; i += 1) {
    const u = String(uuid()).replace(/-/g, '');
    if (!/^[0-9a-f]{32}$/i.test(u)) return null;
    hex += u;
  }
  const raw = Uint8Array.from(hex.match(/../g)!, (h) => parseInt(h, 16));
  return nacl.hash(raw).slice(0, n);
}

// ------------------------------------------------------------ keys and signatures

const keyOfSeed = (seed: Uint8Array) => nacl.sign.keyPair.fromSeed(seed);

/** A QC signing key: from the secure generator, or a given seed (tests). Null when the phone has no secure generator. */
export function makeSigner(name: string, now: number, seed: Uint8Array | null = randomBytes(32)): Signer | null {
  const n = name.trim().slice(0, MAX_QC_NAME);
  if (!n || !seed || seed.length !== 32) return null;
  return { name: n, seed: toB64(seed), key: toB64(keyOfSeed(seed).publicKey), createdAt: now };
}

export function signText(signer: Signer, text: string): string {
  const seed = fromB64(signer.seed);
  if (!seed || seed.length !== 32) throw new Error('No signing key');
  return toB64(nacl.sign.detached(ascii(text), keyOfSeed(seed).secretKey));
}

export function verifyText(key: string, text: string, sig: string): boolean {
  const k = fromB64(key);
  const s = fromB64(sig);
  if (!k || k.length !== 32 || !s || s.length !== 64) return false;
  try {
    return nacl.sign.detached.verify(ascii(text), s, k);
  } catch {
    return false;
  }
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * A key as sixteen characters in fours, to read off one screen against
 * another: 80 bits of its SHA-512, in letters and digits that can't be
 * mistaken for each other (no I, L, O or U).
 */
export function keyPrint(key: string): string {
  const k = fromB64(key);
  if (!k) return '';
  const h = nacl.hash(k);
  let bits = 0;
  let acc = 0;
  let out = '';
  for (let i = 0; i < 10; i += 1) {
    acc = (acc << 8) | h[i]!;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += CROCKFORD[(acc >> bits) & 31];
    }
  }
  return out.match(/.{4}/g)!.join('-');
}

const isKey = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v) && fromB64(v)?.length === 32;
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// ------------------------------------------------------------ the store

export const emptySigning = (): SigningBook => ({ signer: null, qcs: [], copies: [], foreign: false, dropped: 0 });

function validSigner(v: unknown): Signer | null {
  if (!isRec(v) || typeof v.name !== 'string' || typeof v.seed !== 'string' || !isKey(v.key) || !isTime(v.createdAt)) return null;
  const name = v.name.trim().slice(0, MAX_QC_NAME);
  const seed = fromB64(v.seed);
  // The key has to be the seed's own: a store whose two disagree signs nothing.
  if (!name || !seed || seed.length !== 32 || toB64(keyOfSeed(seed).publicKey) !== v.key) return null;
  return { name, seed: v.seed, key: v.key, createdAt: v.createdAt };
}
function validQc(v: unknown): TrustedQc | null {
  if (!isRec(v) || !isKey(v.key) || typeof v.name !== 'string' || !isTime(v.trustedAt)) return null;
  const name = v.name.trim().slice(0, MAX_QC_NAME);
  return name ? { key: v.key, name, trustedAt: v.trustedAt } : null;
}
function validCopy(v: unknown): SignedCopy | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id || v.id.length > MAX_ID || typeof v.code !== 'string' || v.code.length > MAX_COPY || !v.code.startsWith('PFP1:') || !isTime(v.at)) return null;
  return { id: v.id, code: v.code, at: v.at };
}

export function parseSigning(raw: string | null | undefined): SigningBook {
  const empty = emptySigning();
  if (!raw) return empty;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return { ...empty, dropped: 1 };
  }
  if (!isRec(v) || !Number.isInteger(v.v) || (v.v as number) < 1) return { ...empty, dropped: 1 };
  if ((v.v as number) > SIGNING_VERSION) return { ...empty, foreign: true };
  let dropped = 0;
  const signer = v.signer === null || v.signer === undefined ? null : validSigner(v.signer);
  if (v.signer && !signer) dropped += 1;
  const qcs: TrustedQc[] = [];
  for (const x of Array.isArray(v.qcs) ? v.qcs : []) {
    const q = validQc(x);
    if (!q || qcs.some((o) => o.key === q.key)) dropped += 1;
    else qcs.push(q);
  }
  const copies: SignedCopy[] = [];
  for (const x of Array.isArray(v.copies) ? v.copies : []) {
    const c = validCopy(x);
    if (!c || copies.some((o) => o.id === c.id)) dropped += 1;
    else copies.push(c);
  }
  return { signer, qcs: qcs.slice(0, MAX_QCS), copies: copies.slice(0, MAX_COPIES), foreign: false, dropped };
}

export function serialiseSigning(b: SigningBook): string {
  return JSON.stringify({ v: SIGNING_VERSION, signer: b.signer, qcs: b.qcs, copies: b.copies });
}

export const setSigner = (b: SigningBook, signer: Signer | null): SigningBook => ({ ...b, signer });

/**
 * Trust a QC's key. A key already trusted keeps its first date; the name is the one the QC signs with now.
 * One key to a name: a new key for a QC this phone trusts replaces the old one, which may be on a lost phone.
 */
export function trustQc(b: SigningBook, key: string, name: string, now: number): SigningBook {
  if (!isKey(key) || !name.trim()) return b;
  const had = b.qcs.find((q) => q.key === key);
  const q: TrustedQc = { key, name: name.trim().slice(0, MAX_QC_NAME), trustedAt: had?.trustedAt ?? now };
  return { ...b, qcs: [q, ...b.qcs.filter((x) => x.key !== key && !sameName(x.name, q.name))].slice(0, MAX_QCS) };
}

export const untrustQc = (b: SigningBook, key: string): SigningBook => ({ ...b, qcs: b.qcs.filter((q) => q.key !== key) });

/** Keep (or, with null, forget) the signed code a program came in on. Copies of programs no longer on the phone go. */
export function keepCopy(b: SigningBook, id: string, code: string | null, now: number, liveIds: readonly string[]): SigningBook {
  const live = new Set(liveIds);
  const rest = b.copies.filter((c) => c.id !== id && live.has(c.id));
  const copies = code && live.has(id) ? [{ id, code, at: now }, ...rest] : rest;
  return { ...b, copies: copies.slice(0, MAX_COPIES) };
}

// ------------------------------------------------------------ who sent it

export type Signed = { name: string; key: string; code: string };

export type Verdict = {
  state: 'yours' | 'trusted' | 'new-qc' | 'other-key' | 'unsigned';
  name: string | null;
  key: string | null;
  print: string;
  /** Not to be taken at all, and why. */
  blocked: string | null;
  /** Only to be taken by trusting the QC who signed it. */
  needsTrust: boolean;
};

/**
 * What a code's signature means on this phone. A phone that trusts a QC (or
 * is one) takes a qualified program only from a QC it trusts, or one it
 * trusts now; a program in development comes in either way, said for what it is.
 */
export function verdict(signed: Signed | null, qualified: boolean, b: SigningBook): Verdict {
  const guarded = b.qcs.length > 0 || b.signer !== null;
  if (!signed) {
    return {
      state: 'unsigned',
      name: null,
      key: null,
      print: '',
      blocked:
        qualified && guarded
          ? b.signer
            ? "It says it's qualified, but it isn't signed by you or a QC this phone trusts. Qualify it here, on its own coupon."
            : "It says it's qualified, but it isn't signed by your QC. Ask your QC to share it from the QC phone."
          : null,
      needsTrust: false,
    };
  }
  const base = { name: signed.name, key: signed.key, print: keyPrint(signed.key), blocked: null };
  if (b.signer?.key === signed.key) return { ...base, state: 'yours', needsTrust: false };
  if (b.qcs.some((q) => q.key === signed.key)) return { ...base, state: 'trusted', needsTrust: false };
  const renamed = b.qcs.some((q) => sameName(q.name, signed.name)) || (b.signer !== null && sameName(b.signer.name, signed.name));
  return { ...base, state: renamed ? 'other-key' : 'new-qc', needsTrust: qualified && guarded };
}
