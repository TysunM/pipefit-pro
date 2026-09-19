// Getting the sheet off the phone
// -------------------------------
// The sheet is a page of HTML. Turning it into something a man can hold means
// the platform's own printer, and the two platforms want opposite things: a
// browser has a print dialog and no file system, a phone has a file system and
// a share sheet.
//
// The browser is handled here rather than by expo-print, because expo-print's
// web build ignores the HTML it is handed and prints whatever page is on screen
// — which would put the app's own buttons on paper instead of the drawing. So
// the sheet goes into an iframe of its own and that iframe is what prints. An
// iframe rather than a new window on purpose: a pop-up blocker would eat the
// window, and there is nothing to warn about if nothing was blocked.
//
// Everything here is best effort by nature — a share sheet can be dismissed, a
// printer can be missing — so nothing throws. The caller gets told what
// happened in words it can put on screen.

import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type ShareOutcome =
  | { ok: true }
  /** Nothing was shared, and this is what to tell the man holding the phone. */
  | { ok: false; why: string };

/** How long the sheet gets to lay itself out before the print dialog opens. */
const LAYOUT_MS = 350;
/** And how long it stays in the page afterwards, since printing is not instant. */
const CLEANUP_MS = 60_000;

/**
 * Print one sheet from a browser.
 *
 * The sheet is self-contained — its own style, no scripts, nothing to fetch —
 * so an iframe holding it needs only a moment to lay out before it can print.
 */
async function printInBrowser(html: string): Promise<ShareOutcome> {
  const doc: Document | undefined = typeof document === 'undefined' ? undefined : document;
  if (!doc?.body) return { ok: false, why: 'There is no page here to print from.' };

  const frame = doc.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('title', 'Spool sheet');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  doc.body.appendChild(frame);

  const inner = frame.contentWindow;
  if (!inner) {
    frame.remove();
    return { ok: false, why: 'The browser would not open a page to print from.' };
  }

  inner.document.open();
  inner.document.write(html);
  inner.document.close();

  await new Promise((r) => setTimeout(r, LAYOUT_MS));
  inner.focus();
  inner.print();

  // Left in place for a while: on some browsers print() returns before the
  // dialog has read the page, and taking the iframe away prints nothing.
  setTimeout(() => frame.remove(), CLEANUP_MS);
  return { ok: true };
}

/**
 * Print or share one sheet.
 *
 * On a phone the sheet becomes a real PDF first and then goes to the share
 * sheet, so it can go to a printer, a chat, an email or the phone's own files —
 * whatever is on the job.
 */
export async function shareSheet(html: string, title: string): Promise<ShareOutcome> {
  try {
    if (Platform.OS === 'web') return await printInBrowser(html);

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    if (!(await Sharing.isAvailableAsync()))
      return { ok: false, why: 'This phone has nothing to share to. The sheet was made but cannot be sent.' };

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: title,
    });
    return { ok: true };
  } catch (e) {
    // A dismissed share sheet lands here on some phones, which is not a fault
    // worth shouting about — so the wording covers both.
    const why = e instanceof Error && e.message ? e.message : 'The sheet could not be made.';
    return { ok: false, why };
  }
}
