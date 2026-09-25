// End-to-end check of the real Nota Bene literature-note template through the
// plugin's real Nunjucks environment: import, student types, highlights more,
// syncs — nothing typed is lost and no quote is duplicated.
import { readFileSync } from 'fs';
import moment from 'moment';
import path from 'path';

import { annotationSyncId, applySync, planSync, unsyncedAnnotations } from '../sync';
import { PersistExtension, renderTemplate } from '../template.env';

jest.mock('obsidian', () => ({ moment: require('moment') }), { virtual: true });

const TEMPLATE = readFileSync(
  path.resolve(
    __dirname,
    '../../../Templates/Literature Note Template - Zotero Import.md'
  ),
  'utf8'
);

function annot(id: string, extra: Record<string, any>) {
  return { id, date: moment(), ...extra };
}

async function render(annotations: any[], note: string) {
  for (const a of annotations) a.nbId = annotationSyncId(a);
  const data = PersistExtension.prepareTemplateData(
    {
      title: 'A Study',
      citekey: 'smith2023',
      annotations,
      newAnnotations: unsyncedAnnotations(annotations, note),
    },
    note
  );
  return renderTemplate('', TEMPLATE, data);
}

async function sync(annotations: any[], note: string) {
  const rendered = await render(annotations, note);
  return applySync(note, planSync(note, rendered));
}

describe('Nota Bene template: type-while-highlighting workflow', () => {
  const h1 = annot('AAAA1111', {
    annotatedText: 'Reading is\nthinking',
    pageLabel: '213',
    page: 1,
    comment: 'core claim\nsecond line',
  });
  const h2 = annot('BBBB2222', { annotatedText: 'Evidence here', page: 7 });
  const sticky = annot('CCCC3333', { comment: 'Is this generalizable?', pageLabel: '220' });

  test('first import formats quotes with printed page numbers and block ids', async () => {
    const note = await render([h1], '');
    expect(note).toContain(
      '> "Reading is thinking" (p. 213)\n> — *my note: core claim\n> second line* ^nb-AAAA1111'
    );
  });

  test('sync appends only new highlights and preserves everything typed', async () => {
    let note = await render([h1], '');

    // Student types notes while reading, and trims the imported quote.
    note = note
      .replace('## Key ideas/findings/arguments', '## Key ideas/findings/arguments\n- MY TYPED IDEA')
      .replace('"Reading is thinking"', '"Reading = thinking"');

    note = await sync([h1, h2, sticky], note);

    expect(note).toContain('- MY TYPED IDEA');
    expect(note).toContain('"Reading = thinking"');
    expect(note).not.toContain('"Reading is thinking"');
    expect(note).toContain('> "Evidence here" (p. 7) ^nb-BBBB2222');
    expect(note).toContain('> *my note (p. 220): Is this generalizable?* ^nb-CCCC3333');
    expect(note.match(/\^nb-AAAA1111/g)).toHaveLength(1);

    // A second sync with nothing new is a no-op.
    expect(await sync([h1, h2, sticky], note)).toBe(note);
  });

  test('a quote moved to another section is not re-added', async () => {
    let note = await render([h1, h2], '');
    const line = '> "Evidence here" (p. 7) ^nb-BBBB2222';
    note = note.replace(`\n\n${line}`, '').replace(
      '## Key ideas/findings/arguments',
      `## Key ideas/findings/arguments\n${line}`
    );
    const after = await sync([h1, h2], note);
    expect(after.match(/\^nb-BBBB2222/g)).toHaveLength(1);
  });
});
