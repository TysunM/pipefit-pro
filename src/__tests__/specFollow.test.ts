import { specMoved, specNotice } from '../hooks/specFollow';
import { familyAfterMaterial } from '../calc/takeoffCatalog';

describe('an open screen follows the job', () => {
  const was = { nps: 2, kind: 'LR', schedule: '40' } as const;

  test('only what the job changed moves', () => {
    expect(specMoved(was, { ...was, nps: 1 })).toEqual({ nps: 1 });
    expect(specMoved(was, { nps: 4, kind: 'SR', schedule: '80' })).toEqual({ nps: 4, kind: 'SR', schedule: '80' });
    expect(specMoved(was, { ...was })).toEqual({});
  });
});

describe('Cut Length follows a change of material', () => {
  test('to the new kind of joint', () => {
    expect(familyAfterMaterial('cs', 'pvc')).toBe('socket');
    expect(familyAfterMaterial('pvc', 'ci-soil')).toBe('nohub');
    expect(familyAfterMaterial('ci-soil', 'cs')).toBe('welded');
  });

  test("and leaves the fitter's joint alone within a kind", () => {
    expect(familyAfterMaterial('cs', 'ss316l')).toBeNull();
    expect(familyAfterMaterial('pvc', 'cpvc')).toBeNull();
    expect(familyAfterMaterial('pvc', 'pvc')).toBeNull();
  });
});

describe('the change is shown on screen', () => {
  const job = { nps: 2, kind: 'LR', schedule: '40', material: 'cs', wall: '40' } as const;

  test('says the new pipe in full', () => {
    expect(specNotice(job, { ...job, nps: 1, material: 'pvc' })).toBe('Pipe changed to 1" PVC SCH 40 LR, to match the job.');
  });

  test('a material change alone is shown, and no change is not', () => {
    expect(specNotice(job, { ...job, material: 'ss316l', wall: '40S' })).toMatch(/^Pipe changed to 2" .*40S LR/);
    expect(specNotice(job, { ...job })).toBeNull();
  });
});
