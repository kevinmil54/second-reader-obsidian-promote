// Filling in the Zotero links that some handed-out literature notes lack.
//
// Literature notes from early course packages have an empty `zotero:`
// property and only a "Cite · Full text" line under the title, where notes
// made by the import have "Open PDF · Open in Zotero · Cite · Full text".
// These helpers work out the line edits that bring such a note up to date,
// touching nothing else, so a student's own writing is never changed.

import { openPdfUrl } from './classCopy';

export interface LineEdit {
  line: number; // 0-based line in the note
  insert: boolean; // true: insert `text` before this line; false: replace it
  text: string;
}

const FRONTMATTER_END = /^---[ \t]*$/;
const CITEKEY_LINE = /^citekey:[ \t]*@?(\S+)[ \t]*$/;
const EMPTY_ZOTERO_LINE = /^zotero:[ \t]*$/;
const PDF_LINE = /^pdf:/;
const ZOTERO_LINE = /^zotero:/;
const OLD_HEADER = /^> \*\*Cite:\*\* \[@[^\]]*\] · \*\*Full text \(md\):\*\* \[\[source-md\]\][ \t]*$/;

export function zoteroSelectUrl(citekey: string): string {
  return `zotero://select/items/@${citekey.replace(/^@/, '')}`;
}

export function noteHeader(citekey: string, noteBasename: string): string {
  const key = citekey.replace(/^@/, '');
  return (
    `> **Zotero:** [Open PDF](${openPdfUrl(noteBasename)}) · ` +
    `[Open in Zotero](${zoteroSelectUrl(key)}) · ` +
    `**Cite:** [@${key}] · **Full text (md):** [[source-md]]`
  );
}

// The edits a note needs, in increasing line order (empty when it needs none
// or isn't a literature note with a citekey).
export function zoteroLinkEdits(text: string, noteBasename: string): LineEdit[] {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  if (!FRONTMATTER_END.test(lines[0] ?? '')) return [];
  const end = lines.findIndex((l, i) => i > 0 && FRONTMATTER_END.test(l));
  if (end < 0) return [];

  let citekey = '';
  let zoteroAt = -1;
  let emptyZotero = false;
  let hasPdf = false;
  for (let i = 1; i < end; i++) {
    const m = CITEKEY_LINE.exec(lines[i]);
    if (m) citekey = m[1];
    if (ZOTERO_LINE.test(lines[i])) {
      zoteroAt = i;
      emptyZotero = EMPTY_ZOTERO_LINE.test(lines[i]);
    }
    if (PDF_LINE.test(lines[i])) hasPdf = true;
  }
  if (!citekey) return [];

  const edits: LineEdit[] = [];
  if (emptyZotero) {
    edits.push({ line: zoteroAt, insert: false, text: `zotero: ${zoteroSelectUrl(citekey)}` });
  }
  if (!hasPdf && zoteroAt >= 0) {
    edits.push({ line: zoteroAt + 1, insert: true, text: 'pdf: ' });
  }
  const header = lines.findIndex((l, i) => i > end && OLD_HEADER.test(l));
  if (header >= 0) {
    edits.push({ line: header, insert: false, text: noteHeader(citekey, noteBasename) });
  }
  return edits;
}

// Applies edits to the whole text (for notes that aren't open in an editor).
// Keeps the note's own line endings.
export function applyLineEdits(text: string, edits: LineEdit[]): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  for (const e of [...edits].sort((a, b) => b.line - a.line)) {
    if (e.insert) lines.splice(e.line, 0, e.text);
    else lines[e.line] = e.text;
  }
  return lines.join(eol);
}
