/*
 * Second Reader: New project (the parts that don't touch Obsidian)
 *
 * A project is a folder in the projects folder holding two notes: the project
 * note (the outline, the notes it draws on) and the project letter, a dated
 * log written to the second reader, whose "Permanent note candidates" work
 * like the ones in a literature note.
 *
 * The templates are filled the way the synthesis template is: {{placeholders}}
 * plus the few Templater expressions an instructor's own project template
 * holds. A template with any other Templater code can't be filled here, so
 * fillProjectTemplate returns null and the caller uses the built-in note.
 */

import { carryOverTopics, ensureTopicsLine, sanitizeFilename } from './promote';

export interface ProjectSettings {
  projectsFolder: string;
  projectTemplatePath: string; // "" = built-in project note
  projectLetterTemplatePath: string; // "" = built-in letter
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  projectsFolder: 'Projects',
  projectTemplatePath: 'Templates/Project Template.md',
  projectLetterTemplatePath: 'Templates/Project Letter Template.md',
};

export const OUTPUT_TYPES = [
  'talk',
  'article',
  'book-chapter',
  'grant',
  'course',
  'personal',
  'paper',
  'other',
];
export const DEFAULT_OUTPUT_TYPE = 'other';

// The folder and note name for a project title. Empty when the title has
// nothing a file name can keep.
export function projectName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned.replace(/[. ]/g, '')) return '';
  return sanitizeFilename(cleaned);
}

// A value for a YAML property: plain when that is safe, quoted otherwise.
export function yamlValue(s: string): string {
  const plain =
    /^[^\s\-?:,[\]{}#&*!|>'"%@`][^:#]*$/u.test(s) &&
    !/\s$/.test(s) &&
    !/^(true|false|null|yes|no|on|off|~)$/i.test(s) &&
    !/^[\d.+-]+$/.test(s);
  return plain ? s : JSON.stringify(s);
}

// Today's date on the user's own clock, as YYYY-MM-DD.
export function localDate(d: Date = new Date()): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

// Sets a property in the note's frontmatter. Without `force`, a value the
// template already holds (such as "output-type: paper") is left alone; only a
// blank value, a {{placeholder}} or a Templater expression is replaced.
function setFrontmatterValue(
  text: string,
  key: string,
  value: string,
  force = false
): string {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!fm) return text;
  const lines = fm[1].split(/\r?\n/);
  const at = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (at < 0) return text;
  const current = lines[at].slice(key.length + 1).trim();
  if (!force && current !== '' && current !== '""' && !/<%|\{\{/.test(current)) return text;
  lines[at] = `${key}: ${value}`;
  return (
    text.slice(0, fm.index) +
    `---\n${lines.join('\n')}\n---` +
    text.slice(fm.index + fm[0].length)
  );
}

// Puts "Letter to the second reader: [[letter]]" under the note's title, or
// under its properties when it has no title.
export function addLetterLink(text: string, letterName: string): string {
  const link = `Letter to the second reader: [[${letterName}]]`;
  const lines = text.split('\n');
  let at = lines.findIndex((l) => /^# /.test(l));
  if (at < 0) {
    const fm = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/.exec(text);
    at = fm ? text.slice(0, fm.index + fm[0].length).split('\n').length - 2 : -1;
  }
  lines.splice(at + 1, 0, '', link);
  return lines.join('\n');
}

export interface ProjectFill {
  name: string;
  outputType: string;
  date: string;
  // The letter's note name. Only the project note gets it.
  letter?: string;
}

// Fills a project note or letter template. Returns null when the template
// holds Templater code other than the title and the date, so the caller can
// use the built-in body instead.
export function fillProjectTemplate(template: string, f: ProjectFill): string | null {
  const topics = carryOverTopics([f.name]).join(', ');

  let out = setFrontmatterValue(template, 'project', yamlValue(f.name));
  out = setFrontmatterValue(out, 'output-type', f.outputType);
  out = setFrontmatterValue(out, 'status', 'Active');

  // Replacement functions, so a "$" in a title is not read as a pattern.
  out = out
    .replace(/\{\{\s*title\s*\}\}/g, () => f.name)
    .replace(/\{\{\s*project\s*\}\}/g, () => f.name)
    .replace(/\{\{\s*date\s*\}\}/g, () => f.date)
    .replace(/\{\{\s*outputType\s*\}\}/g, () => f.outputType)
    .replace(/\{\{\s*topics\s*\}\}/g, () => topics)
    .replace(/\{\{\s*letter\s*\}\}/g, () => f.letter ?? '')
    .replace(/<%\s*tp\.file\.title(?:\.replace\([^)]*\))?\s*%>/g, () => f.name)
    .replace(/<%\s*tp\.date\.now\(\s*["']YYYY-MM-DD["']\s*\)\s*%>/g, () => f.date);
  if (/<%/.test(out)) return null;

  out = ensureTopicsLine(out, topics);
  if (f.letter && !out.includes(`[[${f.letter}]]`)) out = addLetterLink(out, f.letter);
  return out;
}

// Built-in project note, used when no template is set or the one that is set
// can't be filled. It follows the instructor's Project Template.
export const PROJECT_NOTE_FALLBACK = [
  '---',
  'type: project',
  'project: {{project}}',
  'output-type: {{outputType}}',
  'status: Active',
  'synthesis: []',
  'draft: ""',
  'created: {{date}}',
  'tags: [project]',
  'topics: [{{topics}}]',
  '---',
  '',
  '# {{title}}',
  '',
  'Letter to the second reader: [[{{letter}}]]',
  '',
  '## What this is for',
  '',
  '- ',
  '',
  '## Central claim',
  '',
  '',
  '',
  '## Outline',
  '',
  '1. ',
  '',
  "## Notes I'm drawing on",
  '',
  '- ',
  '',
  '## To check',
  '',
  '- ',
  '',
  '## Tasks',
  '',
  '- [ ] ',
  '',
  '## Draft',
  '',
  'Other notes in this project:',
  '',
  '```dataview',
  'TABLE type AS "Type", status AS "Status"',
  'FROM "Projects"',
  'WHERE project = this.project AND file.name != this.file.name',
  'SORT type ASC, file.name ASC',
  '```',
  '',
  '## Source material',
  '',
  'Permanent notes that link to this note but are not linked here yet:',
  '',
  '```dataview',
  'LIST WITHOUT ID link(file.path, default(title, file.name))',
  'FROM "Permanent notes"',
  'WHERE contains(file.outlinks, this.file.link) AND !contains(this.file.outlinks, file.link)',
  'SORT file.name ASC',
  '```',
  '',
  'Synthesis notes (from the `synthesis` property):',
  '',
  '```dataview',
  'LIST',
  'FROM "Synthesis notes"',
  'WHERE contains(this.synthesis, file.link)',
  '```',
  '',
].join('\n');

// Built-in project letter. Templates/Project Letter Template.md in this
// repository has the same text; a test keeps the two together.
export const LETTER_FALLBACK = [
  '---',
  'created: {{date}}',
  'tags: [project-log]',
  'type: project-log',
  'project: {{project}}',
  'status: Active',
  'topics: [{{topics}}]',
  '---',
  '',
  '*Writing to: my second reader*',
  '',
  '### {{date}}',
  '',
  "#### What I'm thinking and planning as I start to write",
  '',
  '- [ ] ',
  '',
  '#### What I did today',
  '',
  '- [ ] ',
  '',
  '#### What comes next',
  '',
  '- [ ] ',
  '',
  '## Permanent note candidates',
  '',
  '*Ideas from the entries above that are worth keeping. Write each as a title in your own words. Checking the box creates a permanent note and turns the line into a link to it.*',
  '',
  '- [ ] ',
  '- [ ] ',
  '',
].join('\n');
