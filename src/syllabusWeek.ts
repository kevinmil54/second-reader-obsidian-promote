// Finds the next class session in a syllabus, so a long syllabus can be
// opened at the week the class meets next. Weeks are headings like
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

// The next class session: the earliest week whose date is today or later. On
// a class day that is today's class. After the last class, the last week.
export function nextClassWeek(weeks: WeekHeading[], today: Date): WeekHeading | null {
  if (!weeks.length) return null;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const upcoming = weeks.find((w) => w.date.getTime() >= day);
  return upcoming ?? weeks[weeks.length - 1];
}
