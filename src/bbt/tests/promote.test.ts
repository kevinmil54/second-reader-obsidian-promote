import {
  candidateTitle,
  carryOverTags,
  collectDetailLines,
  promotedLink,
  sanitizeFilename,
} from '../../promote';

jest.mock(
  'obsidian',
  () => ({
    Notice: class {},
    TFile: class {},
    normalizePath: (p: string) => p,
  }),
  { virtual: true }
);

describe('sanitizeFilename (Windows-safe, which is also macOS-safe)', () => {
  test('replaces characters illegal on Windows and in Obsidian links', () => {
    expect(sanitizeFilename('What: is "reading"? a/b|c #tag [x]')).toBe(
      'What is reading a b c tag x'
    );
  });
  test('strips trailing dots and spaces', () => {
    expect(sanitizeFilename('An idea...  ')).toBe('An idea');
  });
  test('avoids Windows reserved device names', () => {
    expect(sanitizeFilename('con')).toBe('con note');
    expect(sanitizeFilename('LPT1')).toBe('LPT1 note');
  });
  test('never returns an empty name', () => {
    expect(sanitizeFilename('???')).toBe('Untitled permanent note');
  });
  test('caps length', () => {
    expect(sanitizeFilename('a'.repeat(300))).toHaveLength(120);
  });
  test('caps long sentences at a whole word', () => {
    const name = sanitizeFilename(
      'Working judges rolled dice to determine the sentence recommendation prosecutors would make in simulated cases. They gave higher sentences'
    );
    expect(name).toBe(
      'Working judges rolled dice to determine the sentence recommendation prosecutors would make in simulated cases. They gave'
    );
  });
});

describe('candidateTitle', () => {
  test('drops the Tasks plugin done date in either format', () => {
    expect(candidateTitle('An idea  [completion:: 2026-10-05]')).toBe('An idea');
    expect(candidateTitle('An idea ✅ 2026-10-05')).toBe('An idea');
  });
  test('drops the #sr-candidate tag', () => {
    expect(candidateTitle('#sr-candidate An idea')).toBe('An idea');
  });
});

describe('promotedLink', () => {
  test('a plain link when the filename is the whole candidate', () => {
    expect(promotedLink('Reading is thinking', 'Reading is thinking')).toBe(
      '[[Reading is thinking]]'
    );
  });
  test('adds the full wording when the filename was shortened', () => {
    const title =
      'Having friends is related to many positive developmental outcomes, although this effect depends in part on whether the friends are themselves socially competent.';
    const base = sanitizeFilename(title);
    expect(base.length).toBeLessThan(title.length);
    expect(promotedLink(base, title)).toBe(`[[${base}|${title}]]`);
  });
  test('adds the full wording when characters were stripped from the filename', () => {
    expect(promotedLink('a secure base for exploring', 'a "secure base" for exploring')).toBe(
      '[[a secure base for exploring|a "secure base" for exploring]]'
    );
  });
  test('display text never contains a pipe or a closing bracket pair', () => {
    const link = promotedLink('a b c', 'a | b [[c]]');
    expect(link).toBe('[[a b c|a - b c]]');
    expect(link.slice(2, -2).split('|')).toHaveLength(2);
  });
});

describe('carryOverTags', () => {
  test('drops workflow status tags, keeps topical ones, dedupes case-insensitively', () => {
    expect(
      carryOverTags(['literature-note', 'Motivation', 'motivation', 'sr-candidate', 'psych101'])
    ).toEqual(['Motivation', 'psych101']);
  });
});

describe('collectDetailLines', () => {
  test('gathers indented elaboration under a candidate and de-indents it', () => {
    const lines = [
      '- [x] Reading is thinking',
      '\t- because you have to choose',
      '\t\t- nested',
      '- [ ] next candidate',
    ];
    expect(collectDetailLines(lines, 1, 0)).toEqual({
      details: '- because you have to choose\n\t- nested',
      nextIdx: 3,
    });
  });
  test('stops at a blank line', () => {
    const lines = ['- [x] A', '\tdetail', '', '\tnot included'];
    expect(collectDetailLines(lines, 1, 0).details).toBe('detail');
  });
});

describe('Promoter end to end (fake vault)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TFile } = require('obsidian');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Promoter } = require('../../promote');

  function setup(content: string, template?: string) {
    const files = new Map<string, string>();
    const note = Object.assign(new TFile(), {
      path: 'Literature_notes/smith2023.md',
      basename: 'smith2023',
      extension: 'md',
      parent: { path: 'Literature_notes' },
    });
    files.set(note.path, content);
    if (template) files.set('Templates/Permanent Note Template.md', template);
    const vault = {
      read: async (f: any) => files.get(f.path),
      modify: async (f: any, text: string): Promise<void> => void files.set(f.path, text),
      create: async (p: string, text: string) => {
        files.set(p, text);
        return { path: p, basename: p.split('/').pop()!.replace(/\.md$/, '') };
      },
      createFolder: async (): Promise<void> => undefined,
      getAbstractFileByPath: (p: string) =>
        files.has(p)
          ? Object.assign(new TFile(), { path: p, extension: 'md' })
          : null,
    };
    const app = {
      vault,
      metadataCache: {
        getFileCache: () => ({ frontmatter: { tags: ['literature-note', 'psych101'] } }),
      },
    };
    const promoter = new Promoter({ app, registerEvent: (): void => undefined }, () => ({
      newNoteFolder: 'Permanent notes',
      templatePath: 'Templates/Permanent Note Template.md',
    }));
    return { files, note, promoter };
  }

  test('checked candidate becomes a permanent note and a link', async () => {
    const { files, note, promoter } = setup(
      '---\ntags: [literature-note]\n---\n## Permanent note candidates\n- [x] Reading is thinking\n\t- elaboration\n- [ ] Not yet\n',
      '---\ntags: [{{tags}}]\n---\n# {{title}}\n{{details}}\nfrom [[{{source}}]]\n'
    );
    await promoter.handleModify(note);

    expect(files.get('Permanent notes/Reading is thinking.md')).toBe(
      '---\ntags: [permanent-note, psych101]\n---\n# Reading is thinking\n- elaboration\nfrom [[smith2023]]\n'
    );
    expect(files.get(note.path)).toContain('- [x] [[Reading is thinking]]\n\t- elaboration\n- [ ] Not yet');
  });

  test('a Tasks done date stays out of the new note and the link', async () => {
    const { files, note, promoter } = setup(
      '## Permanent note candidates\n- [x] Anchors bias judges  [completion:: 2026-10-05]\n\t- [ ] example of anchoring\n- [ ] \n'
    );
    expect(await promoter.handleModify(note)).toBe(1);
    expect(files.has('Permanent notes/Anchors bias judges.md')).toBe(true);
    expect(files.get('Permanent notes/Anchors bias judges.md')).toContain('# Anchors bias judges\n\n- [ ] example of anchoring');
    expect(files.get(note.path)).toContain('- [x] [[Anchors bias judges]]\n\t- [ ] example of anchoring');
  });

  test('a long candidate keeps its full wording in the literature note link', async () => {
    const long =
      'Ideas about friendship and its importance seem to be continuous across the lifespan from preschool to old age, although other aspects of friendship vary';
    const { files, note, promoter } = setup(
      `## Permanent note candidates\n- [x] ${long}\n\t- elaboration\n`
    );
    expect(await promoter.handleModify(note)).toBe(1);
    const base = sanitizeFilename(long);
    expect(files.has(`Permanent notes/${base}.md`)).toBe(true);
    expect(files.get(note.path)).toContain(`- [x] [[${base}|${long}]]\n\t- elaboration`);
    // the new note's own title still has the whole text
    expect(files.get(`Permanent notes/${base}.md`)).toContain(long);
    // and a second pass leaves the rewritten line alone
    const after = files.get(note.path);
    expect(await promoter.handleModify(note)).toBe(0);
    expect(files.get(note.path)).toBe(after);
  });

  test('already-promoted links and unchecked boxes are left alone', async () => {
    const content = '## Permanent note candidates\n- [x] [[Done]]\n- [ ] Pending\n';
    const { files, note, promoter } = setup(content);
    await promoter.handleModify(note);
    expect(files.get(note.path)).toBe(content);
    expect([...files.keys()]).toEqual([note.path]);
  });
});
