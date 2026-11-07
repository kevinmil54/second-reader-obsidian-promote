/*
 * Second Reader: synthesis notes (pure logic, no Obsidian imports).
 *
 * A synthesis note gathers what a student thinks about one topic. The plugin
 * creates the note when enough permanent notes share a topic, and keeps one
 * block inside it up to date: the list of those permanent notes. Everything
 * else in a synthesis note is the student's own writing, and nothing here
 * ever changes it.
 */

import { carryOverTopics } from './promote';

export const NOTES_BEGIN = '%% begin synthesis-notes %%';
export const NOTES_END = '%% end synthesis-notes %%';
export const NOTES_HEADING = '## Permanent notes not yet used';
// What 2.11 called the section. Notes made then are renamed on the next refresh.
export const LEGACY_NOTES_HEADING = '## Permanent notes on this topic';
const HEADINGS = [NOTES_HEADING, LEGACY_NOTES_HEADING].map((h) => h.toLowerCase());
const isNotesHeading = (line: string) => HEADINGS.includes(line.trim().toLowerCase());

export interface TopicNote {
  path: string;
  name: string; // file basename, used as the link target
  title?: string; // the full title, shown as the link text when it differs
  topics: string[];
}

export interface TopicGroup {
  topic: string; // as first written
  notes: TopicNote[];
}

// topic (lower case) -> the permanent notes that list it, sorted by name.
export function groupByTopic(notes: TopicNote[]): Map<string, TopicGroup> {
  const groups = new Map<string, TopicGroup>();
  for (const note of notes) {
    for (const topic of carryOverTopics(note.topics)) {
      const key = topic.toLowerCase();
      let group = groups.get(key);
      if (!group) {
        group = { topic, notes: [] };
        groups.set(key, group);
      }
      if (!group.notes.some((n) => n.path === note.path)) group.notes.push(note);
    }
  }
  for (const group of groups.values()) {
    group.notes.sort((a, b) => a.name.localeCompare(b.name));
  }
  return groups;
}

// "ai-and-work" -> "ai and work"
export function topicLabel(topic: string): string {
  return topic.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface CreationInput {
  groups: Map<string, TopicGroup>;
  // Topics (lower case) that already have a synthesis note.
  existing: Set<string>;
  // Topics (lower case) the plugin created a note for earlier. A note the
  // student deleted is not made again by the automatic pass.
  alreadyCreated: Set<string>;
  minNotes: number;
  // Only these topics are considered (the ones a changed note lists); null
  // means every topic, which is what the command does.
  only: Set<string> | null;
  automatic: boolean;
}

export function topicsToCreate(input: CreationInput): TopicGroup[] {
  const out: TopicGroup[] = [];
  for (const [key, group] of input.groups) {
    if (input.only && !input.only.has(key)) continue;
    if (group.notes.length < input.minNotes) continue;
    if (input.existing.has(key)) continue;
    if (input.automatic && input.alreadyCreated.has(key)) continue;
    out.push(group);
  }
  return out.sort((a, b) => b.notes.length - a.notes.length || a.topic.localeCompare(b.topic));
}

// Names of the notes a text links to, lower case, without folders or .md.
export function linkedNames(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\[\[([^\]|#^]+)/g)) {
    const name = m[1].trim().split('/').pop()!.replace(/\.md$/i, '');
    out.add(name.toLowerCase());
  }
  return out;
}

function linkFor(n: TopicNote): string {
  const title = (n.title || '').replace(/[|[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  return title && title !== n.name ? `[[${n.name}|${title}]]` : `[[${n.name}]]`;
}

// The list holds the permanent notes on the topic that the note does not link
// to yet. `cited` is the set of names already linked in the student's own text.
export function renderNotesBlock(notes: TopicNote[], cited: Set<string> = new Set()): string {
  const unused = notes.filter((n) => !cited.has(n.name.toLowerCase()));
  let items: string[];
  if (unused.length) items = unused.map((n) => `- ${linkFor(n)}`);
  else if (notes.length) items = ['- Every permanent note on this topic is linked in this note.'];
  else items = ['- No permanent notes list this topic yet.'];
  return [NOTES_BEGIN, ...items, NOTES_END].join('\n');
}

// The block for a note's current text: notes the text (outside the block)
// does not link to.
export function blockForText(notes: TopicNote[], text: string): string {
  return renderNotesBlock(notes, linkedNames(text.replace(BLOCK_RE, '')));
}

const BLOCK_RE = new RegExp(
  `${NOTES_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${NOTES_END.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  )}`
);

export function hasNotesBlock(text: string): boolean {
  return BLOCK_RE.test(text);
}

// Returns the text with the block replaced, or with a new block placed under
// the "Permanent notes on this topic" heading (after the italic instruction
// line that follows it, when there is one). A note with no such heading gets
// the heading and block at the end. Returns the text unchanged if it is
// already current.
export function withNotesBlock(text: string, block: string): string {
  if (hasNotesBlock(text)) return renameLegacyHeading(text.replace(BLOCK_RE, () => block));

  const lines = text.split('\n');
  const headingAt = lines.findIndex(isNotesHeading);
  if (headingAt < 0) {
    return `${text.replace(/\s*$/, '')}\n\n${NOTES_HEADING}\n\n${block}\n`;
  }
  let at = headingAt + 1;
  while (at < lines.length && lines[at].trim() === '') at++;
  if (at < lines.length && /^\*[^*].*\*$/.test(lines[at].trim())) at++;
  lines.splice(at, 0, '', block);
  return renameLegacyHeading(lines.join('\n'));
}

function renameLegacyHeading(text: string): string {
  return text
    .split('\n')
    .map((l) => (l.trim().toLowerCase() === LEGACY_NOTES_HEADING.toLowerCase() ? NOTES_HEADING : l))
    .join('\n');
}

// A new note made from a template that lists its permanent notes with a
// Dataview query: the plugin's own list replaces that query so the note
// doesn't show the same notes twice.
export function dropNotesQuery(text: string): string {
  const lines = text.split('\n');
  const headingAt = lines.findIndex(isNotesHeading);
  if (headingAt < 0) return text;
  let end = lines.length;
  for (let i = headingAt + 1; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const out: string[] = [];
  let inQuery = false;
  for (let i = 0; i < lines.length; i++) {
    const inSection = i > headingAt && i < end;
    if (inSection && !inQuery && /^```dataview\s*$/.test(lines[i].trim())) {
      inQuery = true;
      continue;
    }
    if (inQuery) {
      if (lines[i].trim() === '```') inQuery = false;
      continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function builtInSynthesisBody(topic: string, title: string, today: string): string {
  return [
    '---',
    'type: synthesis',
    `topic: ${topic}`,
    'status: draft',
    `created: ${today}`,
    `updated: ${today}`,
    'tags: [synthesis]',
    '---',
    '',
    `# ${title}`,
    '',
    '## The question',
    '*What are you trying to understand? One or two sentences.*',
    '',
    '',
    '',
    '## Where I stand now',
    '*Your current position as a short numbered list of claims. End each claim with links to the permanent notes that support it.*',
    '',
    '1. ',
    '',
    NOTES_HEADING,
    '*Permanent notes on this topic that this note does not link to yet. Link one in a claim above and it leaves this list.*',
    '',
    '## Where the notes agree and disagree',
    '',
    '- Agree: ',
    '- Disagree: ',
    '',
    '## Gaps',
    '',
    '- ',
    '',
    '## Still to read or think through',
    '',
    '- [ ] ',
    '',
    '## How my thinking has changed',
    '*One dated line each time your position shifts, with the reason.*',
    '',
    `- ${today}: first draft`,
    '',
  ].join('\n');
}

// Fills a vault's synthesis template. Handles the {{title}} / {{date}} style
// of the student template and the two Templater expressions the instructor
// template uses for the title and date, and sets the topic property. Returns
// null when the template holds anything else the plugin can't fill (another
// Templater expression), so the caller can use the built-in body instead.
export function fillSynthesisTemplate(
  template: string,
  topic: string,
  title: string,
  today: string
): string | null {
  let out = template
    .replace(/\{\{\s*title\s*\}\}/g, title)
    .replace(/\{\{\s*date\s*\}\}/g, today)
    .replace(/\{\{\s*topic\s*\}\}/g, topic)
    .replace(/<%\s*tp\.file\.title\s*%>/g, title)
    .replace(/<%\s*tp\.date\.now\(\s*["']YYYY-MM-DD["']\s*\)\s*%>/g, today);

  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(out);
  if (!fm) return null;
  const lines = fm[1].split(/\r?\n/);
  const at = lines.findIndex((l) => /^topic:/.test(l));
  // The topic line may hold a Templater prompt; the plugin knows the topic.
  if (at >= 0) lines[at] = `topic: ${topic}`;
  else lines.push(`topic: ${topic}`);
  out = out.slice(0, fm.index) + `---\n${lines.join('\n')}\n---` + out.slice(fm.index + fm[0].length);

  if (/<%/.test(out)) return null;
  return out;
}

export function synthesisTitle(topic: string): string {
  return `Synthesis - ${topicLabel(topic)}`;
}
