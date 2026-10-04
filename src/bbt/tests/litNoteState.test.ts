import { readFileSync } from 'fs';
import moment from 'moment';
import path from 'path';

import {
  buildBoilerplate,
  literatureNoteState,
  splitTemplateVersions,
} from '../../litNoteState';
import { annotationSyncId, unsyncedAnnotations } from '../sync';
import { PersistExtension, renderTemplate } from '../template.env';

jest.mock('obsidian', () => ({ moment: require('moment') }), { virtual: true });

const ROOT = path.resolve(__dirname, '../../..');
const CURRENT = readFileSync(
  path.join(ROOT, 'Templates/Literature Note Template - Zotero Import.md'),
  'utf8'
);
const PAST = splitTemplateVersions(
  readFileSync(path.join(ROOT, 'src/pastLiteratureTemplates.md'), 'utf8')
);
const BP = buildBoilerplate([CURRENT, ...PAST]);

const ITEM = {
  title: 'Conceptions of effective mathematics teaching',
  authors: 'Jinfa Cai, Tao Wang',
  date: moment('2009-06-01'),
  citekey: 'caiConceptions2009',
  desktopURI: 'zotero://select/library/items/99HNZ2PN',
  bibliography: 'Cai, J., & Wang, T. (2009). Conceptions of effective…',
  attachments: [{ pdfURI: 'zotero://open-pdf/library/items/AFFWWLL5' }],
};

async function generate(template: string, annotations: any[] = []) {
  for (const a of annotations) a.nbId = annotationSyncId(a);
  return renderTemplate(
    '',
    template,
    PersistExtension.prepareTemplateData(
      { ...ITEM, annotations, newAnnotations: unsyncedAnnotations(annotations, '') },
      ''
    )
  );
}

describe('PDF link in generated notes', () => {
  test("records the student's own open-PDF link and shows an Open PDF link", async () => {
    const note = await generate(CURRENT);
    expect(note).toContain('pdf: zotero://open-pdf/library/items/AFFWWLL5\n');
    expect(note).toContain('> **Zotero:** [Open PDF](zotero://open-pdf/library/items/AFFWWLL5) · [Open in Zotero](');
  });

  test('a paper with no PDF gets an empty pdf: line and no Open PDF link', async () => {
    const note = await renderTemplate('', CURRENT, PersistExtension.prepareTemplateData(
      { ...ITEM, attachments: [{}], annotations: [], newAnnotations: [] }, ''));
    expect(note).toMatch(/^pdf: *$/m);
    expect(note).not.toContain('Open PDF');
  });
});

describe('literatureNoteState', () => {
  test('there are past template versions to learn from', () => {
    expect(PAST.length).toBeGreaterThanOrEqual(7);
  });

  test('a freshly imported note is untouched — for every template version ever shipped', async () => {
    for (const template of [CURRENT, ...PAST]) {
      expect(literatureNoteState(await generate(template), BP)).toBe('untouched');
    }
  });

  test('synced highlights alone count as "highlights"', async () => {
    const note = await generate(CURRENT, [
      { id: 'AAAA1111', annotatedText: 'Reading is thinking', pageLabel: '265' },
    ]);
    expect(literatureNoteState(note, BP)).toBe('highlights');
  });

  test('typing in any section counts as worked', async () => {
    const note = await generate(CURRENT);
    const cases = [
      note.replace('## Key ideas/findings/arguments', '## Key ideas/findings/arguments\n- teachers value explanation'),
      note.replace('## Open questions this raises\n\n- ', '## Open questions this raises\n\n- why would that be?'),
      note.replace('> "..." (p. )', '> "a quote I typed myself" (p. 270)'),
      note.replace('- [ ] \n', '- [x] [[Explanation is the core of good teaching]]\n'),
      note + '\nA thought at the very end.\n',
    ];
    for (const c of cases) expect(literatureNoteState(c, BP)).toBe('worked');
  });

  test('worked wins over highlights', async () => {
    const note = (
      await generate(CURRENT, [{ id: 'AAAA1111', annotatedText: 'x', page: 1 }])
    ).replace('## Key ideas/findings/arguments', '## Key ideas/findings/arguments\n- mine');
    expect(literatureNoteState(note, BP)).toBe('worked');
  });

  test('filling in frontmatter (name, course, date read) does not count', async () => {
    const note = (await generate(CURRENT))
      .replace(/^student: *$/m, 'student: Jordan')
      .replace(/^course: *$/m, 'course: ED 359')
      .replace(/^date-read: *$/m, 'date-read: 2026-10-01');
    expect(literatureNoteState(note, BP)).toBe('untouched');
  });

  test('an older note with typed content is worked', async () => {
    const old = PAST[PAST.length - 1];
    const note = (await generate(old)).replace(/\n- \n/, '\n- something I wrote\n');
    expect(literatureNoteState(note, BP)).toBe('worked');
  });
});
