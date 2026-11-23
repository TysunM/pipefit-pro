// The backup as a file
// --------------------
// On the phone: written to the app's cache and handed to the share sheet, so
// it goes to email, Drive, a text — wherever this man keeps things — and read
// back with the phone's own file picker. In the browser: downloaded, and read
// back with the browser's. Both from the file system module the app already
// carries, so this needs no new build.

import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

export type FileOutcome = { ok: true } | { ok: false; why: string };

export function shareBackup(text: string, name: string): Promise<FileOutcome> {
  return shareTextFile(text, name, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Keep this backup somewhere safe', failed: 'The backup could not be made.' });
}

/**
 * Any text as a file: the share sheet on the phone, a download in the browser.
 * The backup and the heat input spreadsheet both go out this way.
 */
export async function shareTextFile(
  text: string,
  name: string,
  o: { mimeType: string; UTI: string; dialogTitle: string; failed: string }
): Promise<FileOutcome> {
  try {
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([text], { type: o.mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return { ok: true };
    }
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true });
    file.write(text);
    if (!(await Sharing.isAvailableAsync())) return { ok: false, why: 'This phone has nothing to share the file to.' };
    await Sharing.shareAsync(file.uri, { mimeType: o.mimeType, dialogTitle: o.dialogTitle, UTI: o.UTI });
    return { ok: true };
  } catch (e) {
    return { ok: false, why: e instanceof Error && e.message ? e.message : o.failed };
  }
}

/** A backup file chosen by hand, as text; null if none was chosen. */
export async function pickBackupText(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json,text/plain';
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return resolve(null);
        void f.text().then(resolve, () => resolve(null));
      };
      input.click();
    });
  }
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled || !picked.result) return null;
  return picked.result.text();
}
