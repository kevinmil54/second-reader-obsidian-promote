import {
  annotationSyncId,
  applySync,
  blockIdFor,
  planSync,
  rebaseRendered,
  unsyncedAnnotations,
} from '../sync';

const note = `---
citekey: smith2023
---

# Title

## Key ideas
- my own typed idea, added while reading

## Quotes worth keeping
*Your Zotero highlights are imported below.*

%% begin annotations %%
> "first highlight" (p. 213) ^nb-AAAA1111
%% end annotations %%

> "a quote I typed myself" (p. 9)

## Related notes
- [[Other note]]
`;

describe('planSync / applySync', () => {
  test('replaces only the persist block, preserving all typed text', () => {
    const rendered = `junk header that must NOT leak in
%% begin annotations %%
> "first highlight" (p. 213) ^nb-AAAA1111

> "second highlight" (p. 214) ^nb-BBBB2222
%% end annotations %%
junk footer`;
    const out = applySync(note, planSync(note, rendered));

    expect(out).toContain('second highlight');
    expect(out).toContain('my own typed idea, added while reading');
    expect(out).toContain('a quote I typed myself');
    expect(out).toContain('[[Other note]]');
    expect(out).not.toContain('junk');
    expect(out.split('%% begin annotations %%')[0]).toBe(
      note.split('%% begin annotations %%')[0]
    );
    expect(out.split('%% end annotations %%')[1]).toBe(
      note.split('%% end annotations %%')[1]
    );
  });

  test('no-op when the rendered block is unchanged', () => {
    const block = note.match(/%% begin annotations %%[\w\W]*?%% end annotations %%/)![0];
    const plan = planSync(note, `header\n${block}\nfooter`);
    expect(plan.edits).toHaveLength(0);
    expect(applySync(note, plan)).toBe(note);
  });

  test('re-inserts a deleted block under the Quotes heading', () => {
    const noMarkers = note.replace(
      /%% begin annotations %%[\w\W]*?%% end annotations %%\n/,
      ''
    );
    const rendered = '%% begin annotations %%\n> "new" ^nb-CCCC3333\n%% end annotations %%';
    const plan = planSync(noMarkers, rendered);
    const out = applySync(noMarkers, plan);

    expect(plan.missing).toEqual(['annotations']);
    const quotesIdx = out.indexOf('## Quotes worth keeping');
    const blockIdx = out.indexOf('%% begin annotations %%');
    const relatedIdx = out.indexOf('## Related notes');
    expect(blockIdx).toBeGreaterThan(quotesIdx);
    expect(blockIdx).toBeLessThan(relatedIdx);
    expect(out).toContain('my own typed idea, added while reading');
  });
});

test('refreshes the trailing import-date marker for older templates', () => {
  const withDate = note + '\n%% Import Date: 2026-01-01T00:00:00.000-05:00 %%\n';
  const rendered = '%% begin annotations %%\nX\n%% end annotations %%\n\n%% Import Date: 2026-09-25T12:00:00.000-04:00 %%\n';
  const out = applySync(withDate, planSync(withDate, rendered));
  expect(out).toContain('%% Import Date: 2026-09-25T12:00:00.000-04:00 %%');
  expect(out).not.toContain('2026-01-01');
  expect(out).toContain('my own typed idea, added while reading');
});

describe('rebaseRendered', () => {
  test('keeps edits made to the quotes block while the sync was running', () => {
    const snapshot = note;
    const rendered = snapshot.replace(
      '^nb-AAAA1111\n%% end annotations %%',
      '^nb-AAAA1111\n\n> "second highlight" (p. 214) ^nb-BBBB2222\n%% end annotations %%'
    );
    // Student trimmed the first quote after the snapshot was taken.
    const current = snapshot.replace('"first highlight"', '"first"');

    const rebased = rebaseRendered(snapshot, current, rendered);
    const out = applySync(current, planSync(current, rebased));

    expect(out).toContain('> "first" (p. 213) ^nb-AAAA1111');
    expect(out).not.toContain('"first highlight"');
    expect(out).toContain('second highlight');
  });

  test('passes the render through when nothing changed meanwhile', () => {
    const rendered = note.replace('%% end annotations %%', '> "x" ^nb-X\n%% end annotations %%');
    expect(rebaseRendered(note, note, rendered)).toBe(rendered);
  });
});

describe('annotation ids and dedupe', () => {
  test('uses the Zotero key when present', () => {
    expect(annotationSyncId({ id: 'ABCD1234' })).toBe('ABCD1234');
    expect(blockIdFor({ id: 'ABCD1234' })).toBe('nb-ABCD1234');
  });

  test('hash fallback is stable and block-id safe', () => {
    const a = { page: 3, annotatedText: 'Some text: with punctuation!' };
    expect(annotationSyncId(a)).toBe(annotationSyncId({ ...a }));
    expect(annotationSyncId(a)).toMatch(/^[A-Za-z0-9-]+$/);
  });

  test('filters out annotations already anywhere in the note', () => {
    const annots = [{ id: 'AAAA1111' }, { id: 'BBBB2222' }];
    const moved = note.replace('## Key ideas\n', '## Key ideas\n> moved ^nb-BBBB2222\n');
    expect(unsyncedAnnotations(annots, note).map((a) => a.id)).toEqual(['BBBB2222']);
    expect(unsyncedAnnotations(annots, moved)).toHaveLength(0);
    expect(unsyncedAnnotations(annots, '')).toHaveLength(2);
  });
});
