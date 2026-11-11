// Finds the current week in a syllabus, so a long syllabus can be opened at
// the week the class is in. Weeks are headings like
// "#### Week 5 (Oct 1): Title". This only reads the text; it never edits it.

export interface WeekHeading {
  line: number; // zero-based line of the heading
  week: number;
  date: Date;
}

const WEEK_HEADING = /^#{1,6}\s+Week\s+(\d+)\s*\(\s*([A-Za-z]+)\.?\s+(\d{1,2})\b/;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// The year isn't written in the heading: take the one that puts the date
// closest to today (a December class is not read in January as next December).
function dateIn(month: number, day: number, today: Date): Date {
  let year = today.getFullYear();
  if (month <= 5 && today.getMonth() >= 7) year += 1;
  else if (month >= 7 && today.getMonth() <= 4) year -= 1;
  return new Date(year, month, day);
}

export function findWeekHeadings(text: string, today: Date): WeekHeading[] {
  const out: WeekHeading[] = [];
  text.split(/\r?\n/).forEach((lineText, line) => {
    const m = WEEK_HEADING.exec(lineText);
    if (!m) return;
    const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (month < 0) return;
    out.push({ line, week: Number(m[1]), date: dateIn(month, Number(m[3]), today) });
  });
  return out;
}

// The latest week whose class date is today or earlier; before the first
// class, the first week; after the last, the last.
export function currentWeek(weeks: WeekHeading[], today: Date): WeekHeading | null {
  if (!weeks.length) return null;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  let current = weeks[0];
  for (const w of weeks) {
    if (w.date.getTime() <= day) current = w;
  }
  return current;
}
