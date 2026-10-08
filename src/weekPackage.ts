// Packaging a week's literature notes for upload (to Canvas, say).
//
// The student copy of a syllabus gets a link under each "Week N" heading:
// obsidian://second-reader?package-week=N&syllabus=<note>. Clicking it copies
// the literature notes linked in that week's section into one folder, zips
// the folder, and shows the zip in Finder or Explorer. Only notes the student
// has made are included; readings without a note are listed in the notice.

import { PROTOCOL_ACTION } from './classCopy';

export const PACKAGE_WEEK_PARAM = 'package-week';
export const SYLLABUS_PARAM = 'syllabus';
export const UPLOADS_FOLDER = 'Uploads';

const HEADING = /^(#{1,6})\s+(.*)$/;
const WEEK = /^Week\s+(\d+)\b/i;
const WIKILINK = /!?\[\[([^\]]+)\]\]/g;

export interface WeekSection {
  week: number;
  // Heading text, e.g. "Week 4 (Sept 24): Preschool in Three Cultures".
  heading: string;
  // 0-based line numbers: the heading, and the last line of the section.
  headingLine: number;
  endLine: number;
}

// Every "Week N" heading and the lines it covers, up to the next heading of
// the same or a higher level.
export function findWeekSections(text: string): WeekSection[] {
  const lines = text.split('\n');
  const headings = lines
    .map((line, i) => {
      const m = HEADING.exec(line);
      return m ? { level: m[1].length, text: m[2].trim(), line: i } : null;
    })
    .filter((h): h is { level: number; text: string; line: number } => !!h);

  const sections: WeekSection[] = [];
  headings.forEach((h, idx) => {
    const week = WEEK.exec(h.text);
    if (!week) return;
    const next = headings.slice(idx + 1).find((o) => o.level <= h.level);
    sections.push({
      week: Number(week[1]),
      heading: h.text,
      headingLine: h.line,
      endLine: next ? next.line - 1 : lines.length - 1,
    });
  });
  return sections;
}

export interface WeekLink {
  target: string;
  // True when the line labels it "Literature note:" or carries an "open pdf"
  // link, i.e. the syllabus says this is a reading's literature note.
  reading: boolean;
}

const READING_LINE = /Literature note:|open-pdf=|zotero:\/\//i;

// The link targets ([[target|alias]] → "target") in one week's section, in
// order and without repeats. Whether a target that exists is a literature
// note is decided by the caller, which can see the vault.
export function linksInWeek(text: string, week: number): WeekLink[] {
  const section = findWeekSections(text).find((s) => s.week === week);
  if (!section) return [];
  const seen = new Map<string, WeekLink>();
  const lines = text.split('\n').slice(section.headingLine + 1, section.endLine + 1);
  for (const line of lines) {
    const reading = READING_LINE.test(line);
    for (const m of line.matchAll(WIKILINK)) {
      if (m[0].startsWith('!')) continue;
      const target = m[1].split('|')[0].split('#')[0].trim();
      if (!target) continue;
      const known = seen.get(target);
      if (known) known.reading = known.reading || reading;
      else seen.set(target, { target, reading });
    }
  }
  return [...seen.values()];
}

function encodeParam(s: string): string {
  return encodeURIComponent(s).replace(
    /[()'!*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

export function packageWeekUrl(week: number, syllabusLinktext: string): string {
  return (
    `obsidian://${PROTOCOL_ACTION}?${PACKAGE_WEEK_PARAM}=${week}` +
    `&${SYLLABUS_PARAM}=${encodeParam(syllabusLinktext)}`
  );
}

export function packageWeekLine(week: number, syllabusLinktext: string): string {
  return `[Package my Week ${week} literature notes for upload](${packageWeekUrl(
    week,
    syllabusLinktext
  )})`;
}

const PACKAGE_LINE = new RegExp(
  `^\\[Package my Week \\d+ literature notes for upload\\]\\(obsidian://${PROTOCOL_ACTION}\\?${PACKAGE_WEEK_PARAM}=`
);

// Puts a packaging link under every week heading that has at least one note
// link in its section. Lines it added before are replaced, so running it
// again doesn't stack links.
export function addPackageLinks(text: string, syllabusLinktext: string): {
  text: string;
  added: number;
} {
  // Drop links added before, with the blank line put between them and their
  // heading.
  const lines: string[] = [];
  for (const line of text.split('\n')) {
    if (PACKAGE_LINE.test(line)) {
      const n = lines.length;
      if (n >= 2 && lines[n - 1] === '' && HEADING.test(lines[n - 2])) lines.pop();
      continue;
    }
    lines.push(line);
  }
  const cleaned = lines.join('\n');
  const sections = findWeekSections(cleaned).filter(
    (s) => linksInWeek(cleaned, s.week).length > 0
  );
  // From the bottom up, so earlier line numbers stay valid.
  for (const s of [...sections].reverse()) {
    lines.splice(s.headingLine + 1, 0, '', packageWeekLine(s.week, syllabusLinktext));
  }
  return { text: lines.join('\n'), added: sections.length };
}

// "ED 336/536 & Psych 401-026" → "ED 336". Falls back to the syllabus name.
export function courseLabel(courseProperty: unknown, syllabusBasename: string): string {
  if (typeof courseProperty === 'string') {
    const m = /^\s*([A-Za-z]+)\s*(\d{3})/.exec(courseProperty);
    if (m) return `${m[1].toUpperCase()} ${m[2]}`;
  }
  return syllabusBasename
    .replace(/\s*-\s*student copy$/i, '')
    .replace(/^Syllabus\s*-\s*/i, '')
    .trim();
}

// Characters that macOS, Windows or Canvas trip over in file names.
export function safeFileName(s: string): string {
  return s
    .replace(/[\\/:*?"<>|#^[\]]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
}

// "ED 336 Week 05 literature notes - Jane Doe"
export function packageName(course: string, week: number, student: string): string {
  const nn = String(week).padStart(2, '0');
  return safeFileName(`${course} Week ${nn} literature notes - ${student}`);
}
