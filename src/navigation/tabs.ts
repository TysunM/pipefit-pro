import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from './types';

// The tabs
// --------
// Six ways into the app from its foot, the same six on every tab. This file
// says which six and in what order they stand before anyone has moved one;
// state/layout.ts keeps the order a man drags them into.
//
//   Home       the job card and the tools this man used last.
//   Calculator the trade calculator, straight to the keys, next to Home
//              because it is the one tool used all day long.
//   Tools      the instruments he works with, and every bend and offset.
//   Projects   everything saved: bolt-ups, isos, spools, level readings.
//   Logs       the books he keeps and looks things up in.
//   Edu        what a new hire learns and proves: orientation and the passport.

export type TabId = 'home' | 'calc' | 'tools' | 'projects' | 'logs' | 'edu';

export type TabRoute = { name: keyof RootStackParamList; params?: object };

export type Tab = {
  id: TabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  on: keyof typeof Ionicons.glyphMap;
  /** Where the tab goes; Home is the stack's root and has nowhere to go. */
  route: TabRoute | null;
};

/** Every tab, in the order they stand before anyone has moved one. */
export const TABS: readonly Tab[] = [
  { id: 'home', label: 'Home', icon: 'home-outline', on: 'home', route: null },
  { id: 'calc', label: 'Calculator', icon: 'calculator-outline', on: 'calculator', route: { name: 'Calculator' } },
  { id: 'tools', label: 'Tools', icon: 'construct-outline', on: 'construct', route: { name: 'Group', params: { id: 'tools' } } },
  { id: 'projects', label: 'Projects', icon: 'folder-outline', on: 'folder', route: { name: 'Projects' } },
  { id: 'logs', label: 'Logs', icon: 'journal-outline', on: 'journal', route: { name: 'Group', params: { id: 'logs' } } },
  { id: 'edu', label: 'Edu', icon: 'school-outline', on: 'school', route: { name: 'Group', params: { id: 'edu' } } },
];

/** The tab ids in their shipped order: Home, Calculator, Tools, Projects, Logs, Edu. */
export const TAB_ORDER: readonly TabId[] = TABS.map((t) => t.id);

export const isTabId = (x: string): x is TabId => TAB_ORDER.includes(x as TabId);

export const tabOf = (id: TabId): Tab => TABS.find((t) => t.id === id) as Tab;
