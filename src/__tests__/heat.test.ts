import {
  Heat,
  differingAt,
  findClash,
  heatShape,
  newHeat,
  normaliseHeat,
  sameHeat,
  traceability,
} from '../calc/heat';

const heat = (h: string, certified = true): Heat => ({ ...newHeat(h, 0), certified });

describe('the comparable form of a heat number', () => {
  it('sets aside case and the separators people sprinkle in', () => {
    expect(normaliseHeat('e7z419')).toBe('E7Z419');
    expect(normaliseHeat('E7Z-419')).toBe('E7Z419');
    expect(normaliseHeat(' E7Z 419 ')).toBe('E7Z419');
    expect(normaliseHeat('E7Z/419')).toBe('E7Z419');
  });

  it('touches nothing else, because the characters are what is read off the steel', () => {
    expect(normaliseHeat('0M2947')).toBe('0M2947');
    expect(normaliseHeat('OM2947')).toBe('OM2947');
    expect(normaliseHeat('0M2947')).not.toBe(normaliseHeat('OM2947'));
  });

  it('calls two spellings of one heat the same heat', () => {
    expect(sameHeat('E7Z419', 'e7z-419')).toBe(true);
    expect(sameHeat('E7Z419', 'E72419')).toBe(false);
  });

  it('survives an empty string without throwing', () => {
    expect(normaliseHeat('')).toBe('');
    expect(heatShape('')).toBe('');
  });
});

describe('catching the transcription that causes the finding', () => {
  const held = [heat('E7Z419'), heat('0M2947'), heat('A12345')];

  it('sees a heat already held, however it was spelled', () => {
    const c = findClash('e7z-419', held)!;
    expect(c.identical).toBe(true);
    expect(c.existing).toBe('E7Z419');
  });

  it('sees the Z-for-2 slip, which reads like a heat number and is not one', () => {
    const c = findClash('E72419', held)!;
    expect(c.identical).toBe(false);
    expect(c.existing).toBe('E7Z419');
  });

  it('sees the O-for-zero slip, both ways round', () => {
    expect(findClash('OM2947', held)?.existing).toBe('0M2947');
    expect(findClash('0M2947', [heat('OM2947')])?.existing).toBe('OM2947');
  });

  it('sees the rest of the pairs a stamp blurs', () => {
    expect(findClash('A1Z345', [heat('A12345')])).not.toBeNull(); // 2 / Z
    expect(findClash('A123455', [heat('A12345S')])).not.toBeNull(); // 5 / S
    expect(findClash('B8842', [heat('88842')])).not.toBeNull(); // B / 8
    expect(findClash('G6001', [heat('66001')])).not.toBeNull(); // G / 6
    expect(findClash('1L7', [heat('117')])).not.toBeNull(); // I / 1 / L
  });

  it('does not cry wolf on two heats that merely look alike to a computer', () => {
    // An edit-distance scheme calls these neighbours. They are two different
    // heats, and a register that questioned every one of them would be turned
    // off inside a shift.
    expect(findClash('A12346', [heat('A12345')])).toBeNull();
    expect(findClash('A1234', [heat('A12345')])).toBeNull();
    expect(findClash('E7Z420', [heat('E7Z419')])).toBeNull();
  });

  it('finds nothing in an empty register, and nothing for an empty entry', () => {
    expect(findClash('E7Z419', [])).toBeNull();
    expect(findClash('', held)).toBeNull();
    expect(findClash('   ', held)).toBeNull();
  });

  it('points at the characters the two disagree on, so the screen can too', () => {
    expect(differingAt('E7Z419', 'E72419')).toEqual([2]);
    expect(differingAt('0M2947', 'OM2947')).toEqual([0]);
    expect(differingAt('E7Z419', 'E7Z419')).toEqual([]);
    // A longer entry disagrees at the characters the shorter one does not have.
    expect(differingAt('A1234', 'A12345')).toEqual([5]);
  });
});

describe('what a job can prove', () => {
  const heats = [heat('E7Z419', true), heat('0M2947', false), heat('A12345', true)];

  it('counts a joint proved only when every heat on it has its cert in hand', () => {
    const t = traceability(
      [
        { id: 'a', heats: ['E7Z419'] },
        { id: 'b', heats: ['E7Z419', 'A12345'] },
      ],
      heats,
    );
    expect(t.proved).toEqual(['a', 'b']);
    expect(t.uncertified).toEqual([]);
  });

  it('holds back a joint where one heat of several has no cert', () => {
    const t = traceability([{ id: 'a', heats: ['E7Z419', '0M2947'] }], heats);
    expect(t.uncertified).toEqual(['a']);
    expect(t.proved).toEqual([]);
  });

  it('separates a heat nobody wrote down from a cert nobody chased', () => {
    // Two different problems that go to two different people.
    const t = traceability(
      [
        { id: 'none', heats: [] },
        { id: 'nocert', heats: ['0M2947'] },
      ],
      heats,
    );
    expect(t.unrecorded).toEqual(['none']);
    expect(t.uncertified).toEqual(['nocert']);
  });

  it('treats a heat the register has never seen as unproved, not as proved', () => {
    const t = traceability([{ id: 'a', heats: ['NEVERSEEN'] }], heats);
    expect(t.uncertified).toEqual(['a']);
  });

  it('matches a joint heat to its register entry through spelling', () => {
    const t = traceability([{ id: 'a', heats: ['e7z-419'] }], heats);
    expect(t.proved).toEqual(['a']);
  });

  it('puts every joint in exactly one of the three, always', () => {
    const joints = [
      { id: 'a', heats: ['E7Z419'] },
      { id: 'b', heats: [] },
      { id: 'c', heats: ['0M2947'] },
      { id: 'd', heats: ['E7Z419', 'A12345'] },
      { id: 'e', heats: ['NOPE'] },
    ];
    const t = traceability(joints, heats);
    expect(t.proved.length + t.uncertified.length + t.unrecorded.length).toBe(joints.length);
    expect(new Set([...t.proved, ...t.uncertified, ...t.unrecorded]).size).toBe(joints.length);
  });

  it('says nothing about an empty job rather than claiming it is proved', () => {
    const t = traceability([], heats);
    expect(t).toEqual({ proved: [], uncertified: [], unrecorded: [] });
  });
});

describe('a fresh heat', () => {
  it('keeps the number as stamped, trimmed, and nothing else filled in', () => {
    const h = newHeat('  E7Z419 ', 1234);
    expect(h.heat).toBe('E7Z419');
    expect(h.certified).toBe(false);
    expect(h.material).toBe('');
    expect(h.createdAt).toBe(1234);
    expect(h.updatedAt).toBe(1234);
  });

  it('is not certified until somebody says so, because nothing else can prove it', () => {
    expect(newHeat('E7Z419', 0).certified).toBe(false);
  });
});
