import { TABS, TAB_ORDER, isTabId, tabOf } from '../navigation/tabs';
import { GROUPS } from '../navigation/groups';

describe('the tabs along the foot', () => {
  test('stand Home, Calculator, PipeFit, Weld, Projects, Edu before anyone moves one', () => {
    expect(TAB_ORDER).toEqual(['home', 'calc', 'tools', 'weld', 'projects', 'edu']);
    expect(TABS.map((t) => t.label)).toEqual(['Home', 'Calculator', 'PipeFit', 'Weld', 'Projects', 'Edu']);
  });

  test('the calculator stands next to home', () => {
    expect(TAB_ORDER.indexOf('calc')).toBe(TAB_ORDER.indexOf('home') + 1);
  });

  test('every tab id is one of the six, once; the Logs are not one, they are on the Projects page', () => {
    expect(new Set(TAB_ORDER).size).toBe(6);
    expect(isTabId('logs')).toBe(false);
    for (const id of TAB_ORDER) expect(tabOf(id).id).toBe(id);
    expect(isTabId('calc')).toBe(true);
    expect(isTabId('settings')).toBe(false);
  });

  test('home is the root and goes nowhere; every other tab goes somewhere', () => {
    expect(tabOf('home').route).toBeNull();
    for (const t of TABS) if (t.id !== 'home') expect(t.route).not.toBeNull();
  });

  test('every group but the Logs has a tab, and every group tab opens its group', () => {
    for (const g of GROUPS.filter((x) => x.id !== 'logs')) {
      const tab = TABS.find((t) => t.id === g.id);
      expect(tab?.route).toEqual({ name: 'Group', params: { id: g.id } });
    }
  });
});
