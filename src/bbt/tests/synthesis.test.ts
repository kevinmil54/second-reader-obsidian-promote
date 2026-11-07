import {
  NOTES_BEGIN,
  NOTES_END,
  NOTES_HEADING,
  LEGACY_NOTES_HEADING,
  blockForText,
  citationFor,
  unusedNotes,
  linkedNames,
  TopicNote,
  builtInSynthesisBody,
  dropNotesQuery,
  fillSynthesisTemplate,
  groupByTopic,
  hasNotesBlock,
  renderNotesBlock,
  topicLabel,
  topicsToCreate,
  withNotesBlock,
} from '../../synthesisCore';

jest.mock(
  'obsidian',
  () => ({
    Notice: class {},
    TFile: class {},
    normalizePath: (p: string) => p,
  }),
  { virtual: true }
);

const note = (name: string, topics: string[]): TopicNote => ({
  path: `Permanent notes/${name}.md`,
  name,
  topics,
});

const NOTES = [
  note('B idea', ['ai-and-work', 'ai-limits']),
  note('A idea', ['ai-and-work']),
  note('C idea', ['AI-and-Work']),
  note('D idea', ['ai-and-work']),
  note('E idea', ['memory']),
];

describe('groupByTopic', () => {
  test('groups by topic ignoring case, sorted by note name', () => {
    const g = groupByTopic(NOTES);
    expect(g.get('ai-and-work')!.notes.map((n) => n.name)).toEqual([
      'A idea',
      'B idea',
      'C idea',
      'D idea',
    ]);
    expect(g.get('ai-and-work')!.topic).toBe('ai-and-work');
    expect(g.get('ai-limits')!.notes).toHaveLength(1);
  });
  test('a note listing a topic twice counts once', () => {
    const g = groupByTopic([note('X', ['memory', 'Memory'])]);
    expect(g.get('memory')!.notes).toHaveLength(1);
  });
  test('notes with no topics add nothing', () => {
    expect(groupByTopic([note('X', [])]).size).toBe(0);
  });
});

describe('topicsToCreate', () => {
  const base = {
    groups: groupByTopic(NOTES),
    existing: new Set<string>(),
    alreadyCreated: new Set<string>(),
    minNotes: 4,
    only: null as Set<string> | null,
    automatic: false,
  };
  test('a topic at the minimum with no note is ready', () => {
    expect(topicsToCreate(base).map((g) => g.topic)).toEqual(['ai-and-work']);
  });
  test('a topic below the minimum is not', () => {
    expect(topicsToCreate({ ...base, minNotes: 5 })).toEqual([]);
  });
  test('a topic that has a synthesis note is skipped', () => {
    expect(topicsToCreate({ ...base, existing: new Set(['ai-and-work']) })).toEqual([]);
  });
  test('the automatic pass only looks at the topics that changed', () => {
    expect(
      topicsToCreate({ ...base, automatic: true, only: new Set(['memory']) })
    ).toEqual([]);
    expect(
      topicsToCreate({ ...base, automatic: true, only: new Set(['ai-and-work']) })
    ).toHaveLength(1);
  });
  test('the automatic pass does not remake a note that was made and then deleted', () => {
    const auto = { ...base, automatic: true, alreadyCreated: new Set(['ai-and-work']) };
    expect(topicsToCreate(auto)).toEqual([]);
    // The command still does.
    expect(topicsToCreate({ ...auto, automatic: false })).toHaveLength(1);
  });
});

describe('notes block', () => {
  const block = renderNotesBlock([note('A idea', []), note('B idea', [])]);
  test('lists notes as links between markers', () => {
    expect(block).toBe(`${NOTES_BEGIN}\n- [[A idea]]\n- [[B idea]]\n${NOTES_END}`);
  });
  test('an empty topic says so', () => {
    expect(renderNotesBlock([])).toContain('No permanent notes list this topic yet.');
  });

  const WITH_HEADING = [
    '# T',
    '',
    '## Permanent notes on this topic',
    '*Fills itself from topic.*',
    '',
    '## Gaps',
    '- mine',
    '',
  ].join('\n');

  test('inserts under the heading, after its italic instruction line', () => {
    const out = withNotesBlock(WITH_HEADING, block);
    expect(out).toBe(
      [
        '# T',
        '',
        NOTES_HEADING,
        '*Fills itself from topic.*',
        '',
        block,
        '',
        '## Gaps',
        '- mine',
        '',
      ].join('\n')
    );
  });
  test('refreshing replaces the block and nothing else', () => {
    const once = withNotesBlock(WITH_HEADING, block);
    const next = renderNotesBlock([note('A idea', []), note('C idea', [])]);
    const twice = withNotesBlock(once, next);
    expect(twice).toBe(once.replace(block, next));
    expect(twice).toContain('- mine');
    expect(hasNotesBlock(twice)).toBe(true);
  });
  test('refreshing with the same list changes nothing', () => {
    const once = withNotesBlock(WITH_HEADING, block);
    expect(withNotesBlock(once, block)).toBe(once);
  });
  test('a note with no heading gets the heading and block at the end', () => {
    const out = withNotesBlock('# T\n\ntext\n', block);
    expect(out).toBe(`# T\n\ntext\n\n${NOTES_HEADING}\n\n${block}\n`);
  });
  test('text around the block survives a refresh, even with $ patterns in it', () => {
    const typed = withNotesBlock(WITH_HEADING, block).replace('- mine', () => '- mine, $& and $1');
    expect(typed).toContain('- mine, $& and $1');
    expect(withNotesBlock(typed, renderNotesBlock([]))).toContain('- mine, $& and $1');
    // And a list that contains $ patterns in a note name is written literally.
    expect(withNotesBlock(typed, renderNotesBlock([note('Costs $& more', [])]))).toContain(
      '- [[Costs $& more]]'
    );
  });
});

describe('dropNotesQuery', () => {
  test('removes the Dataview query from that section only', () => {
    const t = [
      '## Permanent notes on this topic',
      '*x*',
      '',
      '```dataview',
      'LIST',
      '```',
      '',
      '## Used in',
      '',
      '```dataview',
      'LIST',
      '```',
    ].join('\n');
    const out = dropNotesQuery(t);
    expect(out.match(/```dataview/g)).toHaveLength(1);
    expect(out).toContain('## Used in');
  });
});

describe('fillSynthesisTemplate', () => {
  const STUDENT = [
    '---',
    'type: synthesis',
    'topic: ',
    'status: draft',
    'created: {{date}}',
    '---',
    '',
    '# {{title}}',
    '',
  ].join('\n');
  const INSTRUCTOR = [
    '---',
    'type: synthesis',
    'topic: <% await tp.system.prompt("Topic (a value from Reference/Topics)") %>',
    'status: draft',
    'created: <% tp.date.now("YYYY-MM-DD") %>',
    '---',
    '',
    '# <% tp.file.title %>',
    '',
  ].join('\n');

  test('student template: title, date and topic filled in', () => {
    expect(fillSynthesisTemplate(STUDENT, 'memory', 'Synthesis - memory', '2026-11-06')).toBe(
      '---\ntype: synthesis\ntopic: memory\nstatus: draft\ncreated: 2026-11-06\n---\n\n# Synthesis - memory\n'
    );
  });
  test('instructor template: the Templater prompt, date and title are filled in', () => {
    expect(fillSynthesisTemplate(INSTRUCTOR, 'ai-limits', 'Synthesis - ai limits', '2026-11-06')).toBe(
      '---\ntype: synthesis\ntopic: ai-limits\nstatus: draft\ncreated: 2026-11-06\n---\n\n# Synthesis - ai limits\n'
    );
  });
  test('a template with another Templater expression falls back (null)', () => {
    expect(
      fillSynthesisTemplate(INSTRUCTOR + '<% tp.user.something() %>', 't', 'T', '2026-11-06')
    ).toBeNull();
  });
  test('a template with no frontmatter falls back (null)', () => {
    expect(fillSynthesisTemplate('# {{title}}', 't', 'T', '2026-11-06')).toBeNull();
  });
});

describe('built-in note', () => {
  test('has the topic, a heading for the list, and no leftover placeholders', () => {
    const body = builtInSynthesisBody('ai-limits', 'Synthesis - ai limits', '2026-11-06');
    expect(body).toContain('topic: ai-limits');
    expect(body).toContain(NOTES_HEADING);
    expect(body).not.toMatch(/\{\{|<%/);
    const withList = withNotesBlock(body, renderNotesBlock([note('A', [])]));
    expect(withList).toContain('- [[A]]');
    expect(withList.indexOf(NOTES_BEGIN)).toBeGreaterThan(
      withList.indexOf(NOTES_HEADING)
    );
    expect(withList.indexOf(NOTES_END)).toBeLessThan(
      withList.indexOf('## Where the notes agree and disagree')
    );
  });
});

test('topicLabel', () => {
  expect(topicLabel('ai-and-work')).toBe('ai and work');
});

describe('titles as link text', () => {
  const full = 'Cognitive Load Theory (Sweller) - distinguishes among three kinds of cognitive load';
  test('a clipped file name shows the full title', () => {
    const n = { ...note('Cognitive Load Theory (Sweller) - distinguishes among three', []), title: full };
    expect(renderNotesBlock([n])).toContain(`- [[${n.name}|${full}]]`);
  });
  test('a title equal to the file name gives a plain link', () => {
    const n = { ...note('A idea', []), title: 'A idea' };
    expect(renderNotesBlock([n])).toContain('- [[A idea]]');
  });
  test('characters that would break a link are removed from the title', () => {
    const n = { ...note('A', []), title: 'Pipe | and [brackets] here' };
    expect(renderNotesBlock([n])).toContain('- [[A|Pipe and brackets here]]');
  });
});

describe('notes not yet used', () => {
  const notes = [note('A idea', []), note('B idea', []), note('C idea', [])];
  test('linkedNames reads plain, aliased, heading and folder links', () => {
    const names = linkedNames('[[A idea]] [[B idea|b]] [[C idea#Core]] [[Permanent notes/D idea.md]] ![[E idea]]');
    expect([...names].sort()).toEqual(['a idea', 'b idea', 'c idea', 'd idea', 'e idea']);
  });
  test('a note the text links to leaves the list', () => {
    const block = renderNotesBlock(notes, new Set(['b idea']));
    expect(block).toContain('[[A idea]]');
    expect(block).toContain('[[C idea]]');
    expect(block).not.toContain('[[B idea]]');
  });
  test('links inside the block itself do not count', () => {
    const text = withNotesBlock('# T\n\n## Claims\n1. mine\n', renderNotesBlock(notes));
    expect(blockForText(notes, text)).toBe(renderNotesBlock(notes));
  });
  test('linking a note in the claims removes it on the next refresh', () => {
    const text = withNotesBlock('# T\n\n1. A claim ([[B idea]])\n', renderNotesBlock(notes));
    const next = withNotesBlock(text, blockForText(notes, text));
    expect(next).not.toContain('- [[B idea]]');
    expect(next).toContain('- [[A idea]]');
    expect(next).toContain('A claim ([[B idea]])');
    expect(withNotesBlock(next, blockForText(notes, next))).toBe(next);
  });
  test('when every note is linked the list says so', () => {
    const block = renderNotesBlock(notes, new Set(['a idea', 'b idea', 'c idea']));
    expect(block).toContain('Every permanent note on this topic is linked in this note.');
  });
});

describe('notes made by 2.11', () => {
  const old = ['# T', '', LEGACY_NOTES_HEADING, '', `${NOTES_BEGIN}\n- [[A idea]]\n${NOTES_END}`, '', '## Gaps', ''].join('\n');
  test('the old heading is renamed on refresh and the rest is kept', () => {
    const out = withNotesBlock(old, renderNotesBlock([note('A idea', [])], new Set(['a idea'])));
    expect(out).toContain(NOTES_HEADING);
    expect(out).not.toContain(LEGACY_NOTES_HEADING);
    expect(out).toContain('## Gaps');
  });
  test('the old heading is still recognised when the Dataview query is dropped', () => {
    const t = ['# T', LEGACY_NOTES_HEADING, '```dataview', 'LIST', '```', '## Gaps'].join('\n');
    expect(dropNotesQuery(t)).not.toContain('dataview');
  });
});

describe('citing a note', () => {
  const n = { ...note('Clipped file name', []), title: 'The full claim, in a long sentence' };
  test('with nothing selected the title is the alias and is marked for retyping', () => {
    const c = citationFor(n);
    expect(c.text).toBe('[[Clipped file name|The full claim, in a long sentence]]');
    expect(c.text.slice(c.aliasFrom, c.aliasTo)).toBe('The full claim, in a long sentence');
  });
  test('selected text becomes the alias', () => {
    const c = citationFor(n, 'offloading evaluation');
    expect(c.text).toBe('[[Clipped file name|offloading evaluation]]');
  });
  test('a note whose title equals its name gets a plain link', () => {
    expect(citationFor({ ...note('A idea', []), title: 'A idea' })).toEqual({
      text: '[[A idea]]',
      aliasFrom: -1,
      aliasTo: -1,
    });
  });
  test('unusedNotes ignores links inside the block and counts claims', () => {
    const notes = [note('A idea', []), note('B idea', [])];
    const text = withNotesBlock('# T\n\n1. claim ([[B idea|b]])\n', renderNotesBlock(notes));
    expect(unusedNotes(notes, text).map((x) => x.name)).toEqual(['A idea']);
  });
});
