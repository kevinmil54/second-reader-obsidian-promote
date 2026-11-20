// Pure helpers for projects: categories, the time log (a CSV file in the
// vault), and the dated entries in a project letter. No Obsidian imports, so
// these can be tested directly.

import { PROTOCOL_ACTION } from './classCopy';

export interface ProjectSettings {
  // One category per line: "Name", or "Name | folder | template path".
  // Folder and template are optional and fall back to the two settings below.
  projectCategories: string;
  projectFolder: string;
  projectTemplatePath: string;
  projectLetterTemplatePath: string;
  projectTimeLog: string;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  projectCategories: [
    'Talks | Talks | Templates/Talk Project Template.md',
    'Academic writing',
    'Substack posts | Projects | Templates/Substack Project Template.md',
    'Programming',
    'Other academic',
    'Personal',
  ].join('\n'),
  projectFolder: 'Projects',
  projectTemplatePath: 'Templates/Project Template.md',
  projectLetterTemplatePath: 'Templates/Project Letter Template.md',
  projectTimeLog: 'Projects/project-time-log.csv',
};

export const PROJECT_TIMER_PARAM = 'project-timer';
export const NEW_PROJECT_PARAM = 'new-project';

export const timerLink = (action: 'start' | 'stop') =>
  `obsidian://${PROTOCOL_ACTION}?${PROJECT_TIMER_PARAM}=${action}`;
export const newProjectLink = () => `obsidian://${PROTOCOL_ACTION}?${NEW_PROJECT_PARAM}=1`;
export const timerLinksLine = () =>
  `*Writing to: my second reader* · [▶️ Start](${timerLink('start')}) · [🛑 Stop](${timerLink('stop')})`;

// Frontmatter types that mark the project note in a project's folder.
export const PROJECT_NOTE_TYPES = ['project', 'talk-project', 'talk-plan'];
export const LETTER_TYPE = 'project-log';

export interface Category {
  name: string;
  folder: string;
  template: string;
}

export function parseCategories(text: string, s: ProjectSettings): Category[] {
  const seen = new Set<string>();
  const out: Category[] = [];
  for (const line of (text || '').split(/\r?\n/)) {
    const [name, folder, template] = line.split('|').map((x) => x.trim());
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({
      name,
      folder: (folder || s.projectFolder || 'Projects').replace(/\/+$/, ''),
      template: template || s.projectTemplatePath,
    });
  }
  return out;
}

const OUTPUT_TYPES: Record<string, string> = {
  talks: 'talk',
  'academic writing': 'article',
  'substack posts': 'substack-post',
  personal: 'personal',
};
export const outputTypeFor = (category: string) =>
  OUTPUT_TYPES[category.toLowerCase()] ?? 'other';

export function sanitizeProjectName(raw: string): string {
  return (raw || '')
    .replace(/[\\/:*?"<>|#^[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
}

// Fill a template that uses {{...}} placeholders. Templater syntax is left alone.
export function fillPlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in values ? values[k] : m));
}

// Letter templates made before the plugin did timing link to Advanced URI or
// have no timer line. Point the links at the plugin, or add the line.
export function withTimerLinks(text: string): string {
  const line = timerLinksLine();
  const existing = /^\*Writing to: my second reader\*.*$/m;
  if (existing.test(text)) return text.replace(existing, line);
  const fm = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text);
  const at = fm ? fm[0].length : 0;
  return text.slice(0, at) + '\n' + line + '\n' + text.slice(at);
}

export const BUILT_IN_LETTER = `---
created: {{date}}
tags: [project-log]
type: project-log
project: {{project}}
status: Active
topics: [{{topics}}]
---

${timerLinksLine()}

### {{date}}

#### What I'm thinking and planning as I start to write

- [ ]

#### What I did today

- [ ]

#### What comes next

- [ ]

## Permanent note candidates

- [ ]
`;

export const builtInProjectNote = (name: string, category: string, date: string) => `---
type: project
project: ${name}
output-type: ${outputTypeFor(category)}
category: [${category}]
status: Active
created: ${date}
tags: [project]
---

## What this is for

-

## Tasks

- [ ]
`;

// ---- times ----

const pad = (n: number) => String(n).padStart(2, '0');

// Local time, YYYY-MM-DDTHH:MM:SS, so the log reads naturally in a spreadsheet.
export function stamp(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
export const day = (d: Date) => stamp(d).slice(0, 10);
export function clock(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'am' : 'pm'}`;
}
export function parseStamp(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}
export function fmtDur(min: number): string {
  min = Math.max(0, Math.round(min));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
export const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60000);

// A session open longer than this gets a question instead of being counted.
export const STALE_MINUTES = 4 * 60;

// ---- the log ----

export const LOG_FIELDS = [
  'session_id',
  'project',
  'category',
  'letter',
  'start',
  'end',
  'minutes',
  'note',
] as const;
export type LogRow = Record<(typeof LOG_FIELDS)[number], string>;

function csvField(s: string): string {
  s = String(s ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let q = false;
  const endRow = () => {
    row.push(field);
    field = '';
    if (row.some((x) => x !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else field += c;
  }
  if (field !== '' || row.length) endRow();
  return rows;
}

// Columns are found by header name, so a log someone opened and re-saved in
// a spreadsheet with the columns moved still reads correctly.
export function parseLog(text: string): LogRow[] {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {} as LogRow;
    for (const f of LOG_FIELDS) {
      const i = head.indexOf(f);
      o[f] = i >= 0 ? r[i] ?? '' : '';
    }
    return o;
  });
}

export function serializeLog(rows: LogRow[]): string {
  return (
    [LOG_FIELDS.join(','), ...rows.map((r) => LOG_FIELDS.map((f) => csvField(r[f])).join(','))].join(
      '\n'
    ) + '\n'
  );
}

export const isOpen = (r: LogRow) => !r.end && !r.note;

export function projectMinutes(rows: LogRow[], project: string): number {
  return rows
    .filter((r) => r.project === project && r.minutes !== '')
    .reduce((a, r) => a + (Number(r.minutes) || 0), 0);
}

export function newSession(project: string, category: string, letter: string, now: Date): LogRow {
  return {
    session_id: stamp(now).replace(/\D/g, ''),
    project,
    category,
    letter,
    start: stamp(now),
    end: '',
    minutes: '',
    note: '',
  };
}

export function closeSession(r: LogRow, now: Date) {
  const start = parseStamp(r.start);
  r.end = stamp(now);
  r.minutes = String(start ? Math.max(0, minutesBetween(start, now)) : 0);
}

export function dropSession(r: LogRow) {
  r.note = 'not closed';
}

// ---- the letter ----

// Start a new dated entry in the letter. If today's entry is still the
// untimed one the template made, give it the start time instead.
export function withEntry(text: string, now: Date): string {
  const today = day(now);
  const head = `### ${today} · ${clock(now)}`;
  const bare = new RegExp(`^### ${today}[ \\t]*$`, 'm');
  if (bare.test(text)) return text.replace(bare, head);
  const block =
    `${head}\n\n#### What I'm thinking and planning as I start to write\n\n- [ ] \n\n` +
    `#### What I did today\n\n- [ ] \n\n#### What comes next\n\n- [ ] \n\n`;
  const idx = text.indexOf('\n## Permanent note candidates');
  if (idx >= 0) return text.slice(0, idx + 1) + block + text.slice(idx + 1);
  return text.replace(/\s*$/, '\n\n') + block;
}
