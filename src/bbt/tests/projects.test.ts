import {
  DEFAULT_PROJECT_SETTINGS,
  closeSession,
  fillPlaceholders,
  fmtDur,
  isOpen,
  newSession,
  outputTypeFor,
  parseCategories,
  parseLog,
  projectMinutes,
  sanitizeProjectName,
  serializeLog,
  stamp,
  timerLink,
  withEntry,
  withTimerLinks,
} from '../../projectsCore';

describe('categories', () => {
  const cats = parseCategories(DEFAULT_PROJECT_SETTINGS.projectCategories, DEFAULT_PROJECT_SETTINGS);
  test('defaults', () => {
    expect(cats.map((c) => c.name)).toEqual([
      'Talks',
      'Academic writing',
      'Substack posts',
      'Programming',
      'Other academic',
      'Personal',
    ]);
    expect(cats[0]).toEqual({
      name: 'Talks',
      folder: 'Talks',
      template: 'Templates/Talk Project Template.md',
    });
    expect(cats[1]).toEqual({
      name: 'Academic writing',
      folder: 'Projects',
      template: 'Templates/Project Template.md',
    });
  });
  test('skips blanks and duplicates, trims folders', () => {
    const c = parseCategories('A\n\n a \nB | Stuff/ |', DEFAULT_PROJECT_SETTINGS);
    expect(c).toEqual([
      { name: 'A', folder: 'Projects', template: 'Templates/Project Template.md' },
      { name: 'B', folder: 'Stuff', template: 'Templates/Project Template.md' },
    ]);
  });
  test('output types', () => {
    expect(outputTypeFor('Substack posts')).toBe('substack-post');
    expect(outputTypeFor('Programming')).toBe('other');
  });
});

test('project names', () => {
  expect(sanitizeProjectName('  What: is #this? ')).toBe('What is this');
  expect(sanitizeProjectName('Name.')).toBe('Name');
});

test('placeholders', () => {
  expect(fillPlaceholders('{{date}} {{project}} {{other}} <% tp.x %>', { date: 'D', project: 'P' })).toBe(
    'D P {{other}} <% tp.x %>'
  );
});

describe('timer links', () => {
  test('replaces Advanced URI links', () => {
    const t =
      '---\ntype: project-log\n---\n\n*Writing to: my second reader* · [▶️ Start](obsidian://adv-uri?x) · [🛑 Stop](obsidian://adv-uri?y)\n\n### 2026-11-19\n';
    const out = withTimerLinks(t);
    expect(out).toContain(timerLink('start'));
    expect(out).toContain('obsidian://second-reader?project-timer=stop');
    expect(out).not.toContain('adv-uri');
    expect(withTimerLinks(out)).toBe(out);
  });
  test('adds the line after frontmatter', () => {
    const out = withTimerLinks('---\na: 1\n---\nbody\n');
    expect(out.startsWith('---\na: 1\n---\n\n*Writing to')).toBe(true);
    expect(out.endsWith('\nbody\n')).toBe(true);
  });
});

describe('log', () => {
  test('round trip with commas and quotes', () => {
    const r = newSession('A, "B"', 'Talks', 'Projects/x/y.md', new Date(2026, 10, 19, 9, 5, 0));
    const rows = parseLog(serializeLog([r]));
    expect(rows).toEqual([r]);
    expect(r.start).toBe('2026-11-19T09:05:00');
    expect(isOpen(r)).toBe(true);
  });
  test('reads by header name', () => {
    const rows = parseLog('minutes,project\n30,A\n15,A\n10,B\n');
    expect(projectMinutes(rows, 'A')).toBe(45);
  });
  test('closing a session', () => {
    const r = newSession('A', '', 'l', new Date(2026, 10, 19, 9, 0, 0));
    closeSession(r, new Date(2026, 10, 19, 10, 30, 20));
    expect(r.minutes).toBe('90');
    expect(isOpen(r)).toBe(false);
  });
  test('durations', () => {
    expect(fmtDur(5)).toBe('5 min');
    expect(fmtDur(60)).toBe('1 h');
    expect(fmtDur(135)).toBe('2 h 15 min');
  });
});

describe('letter entries', () => {
  const now = new Date(2026, 10, 19, 14, 7, 0);
  test("times today's bare heading", () => {
    expect(withEntry('x\n### 2026-11-19\n\nmore', now)).toBe('x\n### 2026-11-19 · 2:07 pm\n\nmore');
  });
  test('adds an entry before the candidates', () => {
    const out = withEntry('top\n\n### 2026-11-18 · 9:00 am\n\n## Permanent note candidates\n', now);
    expect(out.indexOf('### 2026-11-19 · 2:07 pm')).toBeLessThan(out.indexOf('## Permanent'));
    expect(out.indexOf('### 2026-11-18')).toBeLessThan(out.indexOf('### 2026-11-19'));
  });
  test('appends when there is no candidates section', () => {
    expect(withEntry('top\n', now)).toMatch(/^top\n\n### 2026-11-19 · 2:07 pm/);
  });
  test('stamp is local', () => {
    expect(stamp(now)).toBe('2026-11-19T14:07:00');
  });
});
