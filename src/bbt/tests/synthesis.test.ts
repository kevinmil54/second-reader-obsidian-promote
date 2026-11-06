import {
  NOTES_BEGIN,
  NOTES_END,
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
        '## Permanent notes on this topic',
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
    expect(out).toBe(`# T\n\ntext\n\n## Permanent notes on this topic\n\n${block}\n`);
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
    expect(body).toContain('## Permanent notes on this topic');
    expect(body).not.toMatch(/\{\{|<%/);
    const withList = withNotesBlock(body, renderNotesBlock([note('A', [])]));
    expect(withList).toContain('- [[A]]');
    expect(withList.indexOf(NOTES_BEGIN)).toBeGreaterThan(
      withList.indexOf('## Permanent notes on this topic')
    );
    expect(withList.indexOf(NOTES_END)).toBeLessThan(
      withList.indexOf('## Where the notes agree and disagree')
    );
  });
});

test('topicLabel', () => {
  expect(topicLabel('ai-and-work')).toBe('ai and work');
});
