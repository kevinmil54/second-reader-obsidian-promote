// How far a student has gotten with a literature note, judged from its text:
//   untouched  — only what the template generated
//   highlights — Zotero highlights synced in, but nothing typed yet
//   worked     — the student has written something of their own
//
// "Something of their own" is any body line that isn't template text. Every
// version of the template students may have received is passed in, so an
// instruction line from an older template never counts as student writing.
import { splitLeadingComments } from './templateSettings';

export type LitNoteState = 'untouched' | 'highlights' | 'worked';

export const TEMPLATE_VERSION_SEPARATOR =
  '<<<SECOND-READER-TEMPLATE-VERSION>>>';

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;
const NOTE_PERSIST_BLOCK = /%% begin (.+?) %%[\w\W]*?%% end \1 %%/g;
// In a template, a persist block's lines only ever render inside the block,
// which is stripped from notes anyway — and its lines are patterns like
// `> "{{...}}"` that would otherwise swallow quotes a student typed.
const TEMPLATE_PERSIST_BLOCK =
  /\{%-?\s*persist\b[\s\S]*?\{%-?\s*endpersist\s*-?%\}/g;
const NUNJUCKS = /\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g;

// Empty slots the template leaves for the student to fill in.
const PLACEHOLDERS = [
  /^-$/,
  /^\d+\.$/,
  /^- \[ \]( #sr-candidate)?$/,
  /^- \[\[\]\]$/,
  /^!\[\[\]\]$/,
  /^> "\.\.\." \(p\. ?\)$/,
  /^-{3,}$/,
];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Lines the author-information tool writes under "## Author information".
// They are generated, not typed, so they never count as the student's work.
const AUTHOR_INFO_LINES = [
  /^- \*\*(Lead author|Born–died|Born|About \(Wikidata\)|Affiliation on this paper|Links):\*\*/,
  /^!\[\[Attachments\/Authors\//,
  /^\*Photo: /,
  /^!\[\[[^\]]+#About\]\]$/,
];

// `{% if x %}…{% endif %}` inside a line is optional text: a note imported
// without a PDF simply lacks it. (An if with an else is just "anything".)
const INLINE_IF = /\{%-?\s*if\b[^%]*?%\}([\s\S]*?)\{%-?\s*endif\s*-?%\}/g;

function plainPattern(text: string): string {
  return text.split(NUNJUCKS).map(escapeRegExp).join('.*?');
}

function linePattern(line: string): string {
  let out = '';
  let last = 0;
  for (const m of line.matchAll(INLINE_IF)) {
    out += plainPattern(line.slice(last, m.index));
    out += /\{%-?\s*else\b/.test(m[1]) ? '.*?' : `(?:${plainPattern(m[1])})?`;
    last = (m.index as number) + m[0].length;
  }
  return out + plainPattern(line.slice(last));
}

export interface Boilerplate {
  exact: Set<string>;
  patterns: RegExp[];
}

export function buildBoilerplate(templates: string[]): Boilerplate {
  const exact = new Set<string>();
  const patterns: RegExp[] = [];
  const seenPatterns = new Set<string>();

  for (const template of templates) {
    const body = splitLeadingComments(template)
      .body.replace(FRONTMATTER, '')
      .replace(TEMPLATE_PERSIST_BLOCK, '');
    for (const raw of body.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (!line.includes('{{') && !line.includes('{%')) {
        exact.add(line);
        continue;
      }
      // A line made only of template tags renders as nothing (or as
      // anything), so it can't identify template text.
      const literal = line.replace(NUNJUCKS, '').trim();
      if (!literal) continue;
      const source = '^' + linePattern(line) + '$';
      if (!seenPatterns.has(source)) {
        seenPatterns.add(source);
        patterns.push(new RegExp(source));
      }
    }
  }
  return { exact, patterns };
}

export function splitTemplateVersions(bundle: string): string[] {
  return bundle
    .split(TEMPLATE_VERSION_SEPARATOR)
    .map((t) => t.trim())
    .filter(Boolean);
}

function isTemplateLine(line: string, bp: Boilerplate): boolean {
  if (/^#{1,6}\s/.test(line)) return true; // section headings
  if (line.startsWith('%%')) return true; // Obsidian comments / markers
  if (bp.exact.has(line)) return true;
  if (PLACEHOLDERS.some((p) => p.test(line))) return true;
  return bp.patterns.some((p) => p.test(line));
}

export function literatureNoteState(
  note: string,
  bp: Boilerplate
): LitNoteState {
  const body = note.replace(FRONTMATTER, '');
  let hasQuotes = false;
  const withoutBlocks = body.replace(NOTE_PERSIST_BLOCK, (block) => {
    if (/\^nb-[A-Za-z0-9-]+/.test(block)) hasQuotes = true;
    return '';
  });

  let inAuthorInfo = false;
  for (const raw of withoutBlocks.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#{1,6}\s/.test(line)) {
      inAuthorInfo = /^#{1,6}\s+Author information\s*$/i.test(line);
      continue;
    }
    if (inAuthorInfo && AUTHOR_INFO_LINES.some((p) => p.test(line))) continue;
    if (!isTemplateLine(line, bp)) return 'worked';
  }
  return hasQuotes ? 'highlights' : 'untouched';
}
