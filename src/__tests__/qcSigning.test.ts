import qrcode from 'qrcode-generator';
import { programHtml, runHtml } from '../print/orbital';
import { newGear, newProgram, newRun, qualify, revise, emptyEquations, emptyGear, emptyPrograms, putProgram, type Gear, type Program } from '../state/orbitalBook';
import { applyImport, checksum, packShare, signedCopyFor, unpackShare } from '../state/orbitalShare';
import {
  emptySigning,
  fromB64,
  keepCopy,
  keyPrint,
  makeSigner,
  parseSigning,
  randomBytes,
  serialiseSigning,
  signText,
  toB64,
  trustQc,
  untrustQc,
  verdict,
  verifyText,
  type Signed,
} from '../state/qcSigning';

const T = 1_700_000_000_000;
const hex = (h: string) => Uint8Array.from(h.match(/../g)!, (x) => parseInt(x, 16));
const seedA = hex('9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60');
const qc = makeSigner('J. Ruiz, QC', T, seedA)!;
const other = makeSigner('J. Ruiz, QC', T, new Uint8Array(32).fill(7))!;
const head: Gear = { ...newGear('closed', T), id: 'gear-m9', make: 'AMI', model: 'Model 9', odMin: 0.25, odMax: 1, rpmMax: 6, constant: 0.75 };
const lv = (ip: number) => ({ deg: 93.75, rpm: 4, ip, ib: 20, tp: 0.1, tb: 0.1 });
const program: Program = qualify({ ...newProgram(T), id: 'program-qc-1', name: '316-050-065', material: '316L', od: 0.5, wall: 0.065, headId: head.id, levels: [lv(70), lv(67), lv(64), lv(61)], wps: 'WPS-OW-1', coupon: 'C-1' }, T + 5);
const dev: Program = { ...newProgram(T), id: 'program-dev', name: 'Trial', od: 0.5, wall: 0.065, levels: [lv(60)] };

describe('the key and the signature', () => {
  test('Ed25519 as RFC 8032 has it: the published key and signature for the published seed', () => {
    expect(toB64(fromB64(qc.key)!)).toBe(qc.key);
    expect(Buffer.from(fromB64(qc.key)!).toString('hex')).toBe('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a');
    expect(Buffer.from(fromB64(signText(qc, ''))!).toString('hex')).toBe(
      'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b',
    );
  });
  test('a signature checks against its own text and key, and nothing else', () => {
    const sig = signText(qc, 'level 1 70 A');
    expect(verifyText(qc.key, 'level 1 70 A', sig)).toBe(true);
    expect(verifyText(qc.key, 'level 1 71 A', sig)).toBe(false);
    expect(verifyText(other.key, 'level 1 70 A', sig)).toBe(false);
    expect(verifyText(qc.key, 'level 1 70 A', 'x')).toBe(false);
  });
  test('the key to read off a screen: sixteen characters, no I L O or U, the same every time', () => {
    expect(keyPrint(qc.key)).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
    expect(keyPrint(qc.key)).toBe(keyPrint(qc.key));
    expect(keyPrint(qc.key)).not.toBe(keyPrint(other.key));
  });
  test('base64 both ways for every length', () => {
    for (let n = 0; n < 40; n += 1) {
      const b = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 255);
      expect(Array.from(fromB64(toB64(b))!)).toEqual(Array.from(b));
    }
    expect(fromB64('a+b/')).toBeNull();
  });
});

describe('making a key needs a secure generator', () => {
  const g = globalThis as { crypto?: unknown; expo?: unknown };
  const saved = { crypto: g.crypto, expo: g.expo };
  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: saved.crypto, configurable: true, writable: true });
    g.expo = saved.expo;
  });
  test("the browser's: two keys made are never the same", () => {
    const a = makeSigner('QC', T)!;
    const b = makeSigner('QC', T)!;
    expect(a.key).not.toBe(b.key);
  });
  test("the phone's: Expo's native UUID (SecureRandom) when there is no crypto.getRandomValues", () => {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
    let n = 0;
    g.expo = { uuidv4: () => `${(n += 1).toString(16).padStart(8, '0')}-1111-4222-8333-444455556666` };
    const b = randomBytes(32)!;
    expect(b).toHaveLength(32);
    expect(n).toBe(4);
    expect(toB64(randomBytes(32)!)).not.toBe(toB64(b));
  });
  test('neither: no key, rather than a key someone could guess', () => {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
    g.expo = undefined;
    expect(randomBytes(32)).toBeNull();
    expect(makeSigner('QC', T)).toBeNull();
  });
});

describe('a signed program code', () => {
  const code = packShare(program, [head], [], qc);
  test('reads back with who signed it, and the exact signed code to pass on', () => {
    const out = unpackShare(`From the QC phone {see attached}:\n${code}\nThanks :}`);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.signed).toEqual({ name: 'J. Ruiz, QC', key: qc.key, code });
    expect(out.share.program.levels[0]!.ip).toBe(70);
  });
  test('still small enough to read off a screen as a QR', () => {
    const qr = qrcode(0, 'L');
    qr.addData(code, 'Byte');
    qr.make();
    expect(qr.getModuleCount()).toBeLessThanOrEqual(113);
  });
  test('changed after signing, even with a fresh checksum, it is refused', () => {
    const [, , json, sig] = /^PFP1:([0-9a-f]{8}):(\{.*\})\.(.+)$/.exec(code)!;
    const forged = json!.replace('"ip":70', '"ip":90').replace('[93.75,4,70,', '[93.75,4,90,');
    expect(forged).not.toBe(json);
    expect(unpackShare(`PFP1:${checksum(forged)}:${forged}.${sig}`)).toEqual({ ok: false, why: expect.stringMatching(/signature/) });
    // Signed by someone else under the QC's name and key: refused the same.
    expect(unpackShare(`PFP1:${checksum(json!)}:${json}.${signText(other, json!)}`)).toEqual({ ok: false, why: expect.stringMatching(/signature/) });
    // The signature cut off the end of a message.
    expect(unpackShare(code.slice(0, code.lastIndexOf('.'))).ok).toBe(false);
  });
  test('a code with no signature reads as unsigned', () => {
    const out = unpackShare(packShare(program, [head], []));
    expect(out.ok && out.signed).toBeNull();
  });
});

describe('who a phone takes a program from', () => {
  const signedBy = (s: typeof qc): Signed => ({ name: s.name, key: s.key, code: '' });
  const crew = trustQc(emptySigning(), qc.key, qc.name, T);
  test('a phone with no QC takes anything, saying what it is', () => {
    expect(verdict(null, true, emptySigning())).toMatchObject({ state: 'unsigned', blocked: null, needsTrust: false });
    expect(verdict(signedBy(qc), true, emptySigning())).toMatchObject({ state: 'new-qc', needsTrust: false, print: keyPrint(qc.key) });
  });
  test('a phone that trusts its QC takes a qualified program only signed by them', () => {
    expect(verdict(signedBy(qc), true, crew)).toMatchObject({ state: 'trusted', blocked: null, needsTrust: false });
    expect(verdict(null, true, crew).blocked).toMatch(/isn't signed by your QC/);
    expect(verdict(null, false, crew)).toMatchObject({ state: 'unsigned', blocked: null });
  });
  test('the same name with another key is called out, and is taken only by trusting the new key', () => {
    expect(verdict(signedBy(other), true, crew)).toMatchObject({ state: 'other-key', needsTrust: true });
    expect(verdict(signedBy(other), false, crew)).toMatchObject({ state: 'other-key', needsTrust: false });
  });
  test('the QC phone knows its own key', () => {
    const qcPhone = { ...emptySigning(), signer: qc };
    expect(verdict(signedBy(qc), true, qcPhone).state).toBe('yours');
    expect(verdict(null, true, qcPhone).blocked).not.toBeNull();
  });
  test('trusting again keeps the first date; untrusting forgets the key', () => {
    const again = trustQc(crew, qc.key, 'J. Ruiz (QC lead)', T + 99);
    expect(again.qcs).toEqual([{ key: qc.key, name: 'J. Ruiz (QC lead)', trustedAt: T }]);
    expect(untrustQc(again, qc.key).qcs).toEqual([]);
    expect(trustQc(crew, 'not-a-key', 'X', T)).toBe(crew);
  });
  test("a QC's new key replaces the old one, which may be on a lost phone; another QC is kept", () => {
    const two = trustQc(crew, other.key, 'Night QC', T);
    const newPhone = makeSigner('J. Ruiz, QC', T, new Uint8Array(32).fill(3))!;
    const moved = trustQc(two, newPhone.key, 'j. ruiz, qc', T + 9);
    expect(moved.qcs.map((q) => q.name)).toEqual(['j. ruiz, qc', 'Night QC']);
    expect(moved.qcs.some((q) => q.key === qc.key)).toBe(false);
  });
});

describe('the signed copy a crew phone keeps', () => {
  const code = packShare(program, [head], [], qc);
  const taken = () => {
    const out = unpackShare(code);
    if (!out.ok) throw new Error(out.why);
    return applyImport(out.share, { programs: emptyPrograms(), gear: emptyGear(), equations: emptyEquations() });
  };
  test('passes the program on with the QC signature while it is unchanged', () => {
    const after = taken();
    const mine = after.programs.programs[0]!;
    const book = keepCopy(emptySigning(), mine.id, code, T, [mine.id]);
    expect(signedCopyFor(mine, book.copies)).toEqual({ name: qc.name, key: qc.key, code });
    // Revised on this phone, it is no longer what the QC signed.
    expect(signedCopyFor(revise(mine, T + 50), book.copies)).toBeNull();
  });
  test('copies of programs gone from the phone go; null forgets the copy', () => {
    const book = keepCopy(keepCopy(emptySigning(), 'a', code, T, ['a', 'b']), 'b', code, T, ['a', 'b']);
    expect(book.copies.map((c) => c.id)).toEqual(['b', 'a']);
    expect(keepCopy(book, 'b', null, T, ['b']).copies).toEqual([]);
  });
  test('the store reads back what it wrote, and refuses a key that is not its seed\'s', () => {
    const book = keepCopy(trustQc({ ...emptySigning(), signer: qc }, other.key, 'Night QC', T), program.id, code, T, [program.id]);
    const back = parseSigning(serialiseSigning(book));
    expect(back).toEqual({ ...book, foreign: false, dropped: 0 });
    const bad = JSON.parse(serialiseSigning(book));
    bad.signer.key = other.key;
    expect(parseSigning(JSON.stringify(bad))).toMatchObject({ signer: null, dropped: 1 });
    expect(parseSigning(JSON.stringify({ v: 9 })).foreign).toBe(true);
    expect(putProgram(emptyPrograms(), dev).ok).toBe(true);
  });
});

describe('the signature on paper', () => {
  test('the program sheet and the run sheet carry who signed the program, and say nothing when no one did', () => {
    const line = `J. Ruiz, QC, QC key ${keyPrint(qc.key)}`;
    expect(programHtml(program, head, undefined, [], '2026-11-26', line)).toContain(line);
    expect(programHtml(program, head, undefined, [], '2026-11-26')).not.toContain('QC key');
    const run = { ...newRun(program, 'production', T), weld: '0142' };
    expect(runHtml(run, program, head, undefined, [], undefined, undefined, line)).toContain('Program signed');
    expect(runHtml(run, program, head, undefined, [], undefined, undefined, line)).toContain(line);
    expect(runHtml(run, program, head, undefined, [])).not.toContain('Program signed');
  });
});
