import { currentWeek, findWeekHeadings } from '../../syllabusWeek';

const SYLLABUS = [
  '---',
  'course: ED 359',
  '---',
  '## Course Schedule and Readings',
  '### PART 1',
  '#### Week 1 (Sept 3): Setting the Context',
  'text',
  '#### Week 2 (Sept 10): Theoretical Foundations',
  '### PART 2',
  '#### Week 3 (Oct 1): Literacy',
  '#### Week 13 (Dec 3): The *Seven up* project',
  '## Important Dates',
].join('\n');

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe('findWeekHeadings', () => {
  it('finds each week heading with its line, number and date', () => {
    const w = findWeekHeadings(SYLLABUS, at(2026, 10, 1));
    expect(w.map((x) => [x.line, x.week])).toEqual([[5, 1], [7, 2], [9, 3], [10, 13]]);
    expect(w[0].date).toEqual(at(2026, 9, 3));
    expect(w[3].date).toEqual(at(2026, 12, 3));
  });

  it('ignores headings without a date, and body text that mentions a week', () => {
    expect(findWeekHeadings('## Week one\nWeek 2 (Sept 10)\n#### Week 3 (Smarch 1)', at(2026, 9, 1))).toEqual([]);
  });

  it('puts January dates in the following year when read in the fall', () => {
    const w = findWeekHeadings('#### Week 15 (Jan 7): Wrap', at(2026, 12, 1));
    expect(w[0].date).toEqual(at(2027, 1, 7));
  });
});

describe('currentWeek', () => {
  const weeks = findWeekHeadings(SYLLABUS, at(2026, 10, 1));
  it('is the week of the latest class date that has started', () => {
    expect(currentWeek(weeks, at(2026, 9, 3))?.week).toBe(1);
    expect(currentWeek(weeks, at(2026, 9, 9))?.week).toBe(1);
    expect(currentWeek(weeks, at(2026, 9, 10))?.week).toBe(2);
    expect(currentWeek(weeks, at(2026, 10, 20))?.week).toBe(3);
  });
  it('is the first week before the course starts and the last after it ends', () => {
    expect(currentWeek(weeks, at(2026, 8, 20))?.week).toBe(1);
    expect(currentWeek(weeks, at(2026, 12, 20))?.week).toBe(13);
  });
  it('is null with no weeks', () => {
    expect(currentWeek([], at(2026, 10, 1))).toBeNull();
  });
});
