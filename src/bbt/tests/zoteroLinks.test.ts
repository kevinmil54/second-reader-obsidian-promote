import { applyLineEdits, noteHeader, zoteroLinkEdits } from '../../zoteroLinks';

// A literature note as handed out in the first ED 336 starter vault: empty
// `zotero:`, no `pdf:`, and only "Cite · Full text" under the title.
const OLD_NOTE = [
  '---',
  'tags: [literature-note]',
  'title: "AI as normal technology"',
  'author: Arvind Narayanan, Sayash Kapoor',
  'year: 2025',
  'citekey: narayanana',
  'zotero: ',
  'source-md: "[[]]"',
  'status: literature',
  '---',
  '',
  '# AI as normal technology',
  '',
  '> **Cite:** [@narayanana] · **Full text (md):** [[source-md]]',
  '',
  '## Why I\'m reading this',
  '',
  '- my own words',
  '',
].join('\n');

const fix = (text: string, name = 'AI as normal technology') =>
  applyLineEdits(text, zoteroLinkEdits(text, name));

describe('zoteroLinkEdits', () => {
  test('fills in zotero:, adds pdf: and the full header line', () => {
    const out = fix(OLD_NOTE);
    expect(out).toContain('zotero: zotero://select/items/@narayanana\npdf: \nsource-md:');
    expect(out).toContain(noteHeader('narayanana', 'AI as normal technology'));
    expect(out).toContain(
      '[Open PDF](obsidian://second-reader?open-pdf=AI%20as%20normal%20technology)'
    );
    expect(out).not.toContain('> **Cite:** [@narayanana] · **Full text');
  });

  test("leaves the student's own writing alone", () => {
    const out = fix(OLD_NOTE);
    const tail = (s: string) => s.slice(s.indexOf("## Why I'm reading this"));
    expect(tail(out)).toBe(tail(OLD_NOTE));
  });

  test('does nothing the second time', () => {
    const once = fix(OLD_NOTE);
    expect(zoteroLinkEdits(once, 'AI as normal technology')).toEqual([]);
  });

  test('leaves a current note alone', () => {
    const current = fix(OLD_NOTE).replace('@narayanana', '@narayanan2025');
    expect(zoteroLinkEdits(current, 'AI as normal technology')).toEqual([]);
  });

  test('keeps a zotero: link the note already has', () => {
    const withLink = OLD_NOTE.replace('zotero: ', 'zotero: zotero://select/library/items/ABCD1234');
    const out = fix(withLink);
    expect(out).toContain('zotero: zotero://select/library/items/ABCD1234\npdf: ');
  });

  test('ignores notes without a citekey or frontmatter', () => {
    expect(zoteroLinkEdits(OLD_NOTE.replace('citekey: narayanana', 'citekey: '), 'x')).toEqual([]);
    expect(zoteroLinkEdits('# Just a note\n\nText', 'x')).toEqual([]);
  });

  test('keeps Windows line endings', () => {
    const crlf = OLD_NOTE.replace(/\n/g, '\r\n');
    const out = fix(crlf);
    expect(out).toContain('zotero: zotero://select/items/@narayanana\r\npdf: \r\n');
    expect(out.split('\r\n').length).toBe(crlf.split('\r\n').length + 1);
    expect(out.replace(/\r\n/g, '')).not.toContain('\n');
  });
});
