import {
  addPackageLinks,
  courseLabel,
  findWeekSections,
  linksInWeek,
  packageName,
  packageWeekUrl,
} from '../../weekPackage';

// Lines in the shape of the ED 336 student copy.
const SYLLABUS = `---
course: ED 336/536 & Psych 401-026
---

## Course Schedule and Readings

### PART 1: FOUNDATIONS (Weeks 1–4)

#### Week 1 (Sept 2): Introduction and Overview

No readings.

#### Week 2 (Sept 9): Where We Are

1. Doctorow (2025).
   - Essay: [read](https://pluralistic.net/) · Literature note: [[The reverse-centaur's guide to criticizing AI]]
2. Ahrens (2022).
   - Zotero: [open pdf](obsidian://second-reader?open-pdf=How%20to%20take%20smart%20notes) · Literature note: [[How to take smart notes|Ahrens 2022]]
3. See also [[Class 02 - 2026-09-09 - Student]] and ![[diagram.png]]

#### Week 3 (Sept 16): Models of Human Thriving

1. Ryff (1989).
   - Zotero: [open pdf](obsidian://second-reader?open-pdf=Happiness) · Literature note: [[Happiness Is Everything]]
2. Ryff again: [[Happiness Is Everything#Summary]]

### PART 2: TECHNOLOGY (Weeks 5–8)

#### Week 5 (Sept 30): Technological Change

1. Cuban. Literature note: [[New technologies in old universities]]

## Important Dates

- [[Some other note]]
`;

describe('findWeekSections', () => {
  const sections = findWeekSections(SYLLABUS);

  test('finds each week heading', () => {
    expect(sections.map((s) => s.week)).toEqual([1, 2, 3, 5]);
  });

  test('a week ends at the next heading of the same or higher level', () => {
    const lines = SYLLABUS.split('\n');
    const w3 = sections.find((s) => s.week === 3)!;
    expect(lines[w3.endLine + 1]).toBe('### PART 2: TECHNOLOGY (Weeks 5–8)');
    const w5 = sections.find((s) => s.week === 5)!;
    expect(lines[w5.endLine + 1]).toBe('## Important Dates');
  });
});

describe('linksInWeek', () => {
  test('lists note links in order, marking which are readings, skipping embeds', () => {
    expect(linksInWeek(SYLLABUS, 2)).toEqual([
      { target: "The reverse-centaur's guide to criticizing AI", reading: true },
      { target: 'How to take smart notes', reading: true },
      { target: 'Class 02 - 2026-09-09 - Student', reading: false },
    ]);
  });

  test('a note linked twice (once with a heading) is listed once', () => {
    expect(linksInWeek(SYLLABUS, 3)).toEqual([
      { target: 'Happiness Is Everything', reading: true },
    ]);
  });

  test('links outside week sections and unknown weeks give nothing', () => {
    expect(linksInWeek(SYLLABUS, 1)).toEqual([]);
    expect(linksInWeek(SYLLABUS, 9)).toEqual([]);
    expect(linksInWeek(SYLLABUS, 5).map((l) => l.target)).toEqual([
      'New technologies in old universities',
    ]);
  });
});

describe('addPackageLinks', () => {
  const copy = 'Syllabus - ED 336 Thriving Fall 2026 - student copy';
  const { text, added } = addPackageLinks(SYLLABUS, copy);

  test('adds a link under each week that has note links', () => {
    expect(added).toBe(3);
    expect(text).toContain(
      `#### Week 2 (Sept 9): Where We Are\n\n[Package my Week 2 literature notes for upload](${packageWeekUrl(2, copy)})\n`
    );
    expect(text).not.toContain('Package my Week 1 ');
  });

  test('the link is a well-formed obsidian URL', () => {
    expect(packageWeekUrl(2, copy)).toBe(
      'obsidian://second-reader?package-week=2&syllabus=Syllabus%20-%20ED%20336%20Thriving%20Fall%202026%20-%20student%20copy'
    );
  });

  test('running it again does not stack links', () => {
    const again = addPackageLinks(text, copy);
    expect(again.text).toBe(text);
    expect(again.text.match(/Package my Week 2 /g)).toHaveLength(1);
  });

  test('week sections are unchanged apart from the added lines', () => {
    expect(linksInWeek(text, 2)).toEqual(linksInWeek(SYLLABUS, 2));
  });
});

describe('names', () => {
  test('course label comes from the course property, else the syllabus name', () => {
    expect(courseLabel('ED 336/536 & Psych 401-026', 'x')).toBe('ED 336');
    expect(courseLabel('ED 359/559 & Psych 401-027', 'x')).toBe('ED 359');
    expect(courseLabel(undefined, 'Syllabus - EDUC 250 - student copy')).toBe('EDUC 250');
  });

  test('zip name has the course, a two-digit week, and the student', () => {
    expect(packageName('ED 336', 5, 'Jane Doe')).toBe(
      'ED 336 Week 05 literature notes - Jane Doe'
    );
    expect(packageName('ED 336', 12, 'Ana/Luz: Pérez')).toBe(
      'ED 336 Week 12 literature notes - Ana-Luz- Pérez'
    );
  });
});
