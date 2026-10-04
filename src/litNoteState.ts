// How far a student has gotten with a literature note, judged from its text:
//   untouched  — only what the template generated
//   highlights — Zotero highlights synced in, but nothing typed yet
//   worked     — the student has written something of their own
//
// "Something of their own" is any body line that isn't template text. Every
// version of the template students may have received is passed in, so an
// instruction line from an older template never counts as student writing.

export type LitNoteState = 'untouched' | 'highlights' | 'worked';

export const TEMPLATE_VERSION_SEPARATOR = '<<<SECOND-READER-TEMPLATE-VERSION>>>';

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;
const NOTE_PERSIST_BLOCK = /%% begin (.+?) %%[\w\W]*?%% end \1 %%/g;
// In a template, a persist block's lines only ever render inside the block,
// which is stripped from notes anyway — and its lines are patterns like
// `> "{{...}}"` that would otherwise swallow quotes a student typed.
const TEMPLATE_PERSIST_BLOCK = /\{%-?\s*persist\b[\s\S]*?\{%-?\s*endpersist\s*-?%\}/g;
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

export interface Boilerplate {
  exact: Set<string>;
  patterns: RegExp[];
}

export function buildBoilerplate(templates: string[]): Boilerplate {
  const exact = new Set<string>();
  const patterns: RegExp[] = [];
  const seenPatterns = new Set<string>();

  for (const template of templates) {
    const body = template
      .replace(FRONTMATTER, '')
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
      const source =
        '^' +
        line
          .split(NUNJUCKS)
          .map(escapeRegExp)
          .join('.*?') +
        '$';
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

  for (const raw of withoutBlocks.split(/\r?\n/)) {
    const line = raw.trim();
    if (line && !isTemplateLine(line, bp)) return 'worked';
  }
  return hasQuotes ? 'highlights' : 'untouched';
}
