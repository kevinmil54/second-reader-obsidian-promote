// Settings written in a literature-note template as template comments, e.g.
//
//   {#- reference-style: apa -#}
//   {#- author-info: photos -#}
//
// The template engine drops comments, so these never appear in notes. The
// dashes trim the line break after each one, so the note's properties still
// start on its first line. Second Reader reads reference-style when it
// imports a paper; author-info is read by the separate author-information
// program (add_author_info.py).

export interface TemplateSettings {
  referenceStyle?: string;
  authorInfo?: 'none' | 'basic' | 'photos';
}

const SETTING = /\{#-?\s*([a-z][\w-]*)\s*:\s*([^#\n]*?)\s*-?#\}/gi;
const LEADING_COMMENTS = /^(?:[ \t]*\{#[\s\S]*?#\}[ \t]*(?:\r?\n|$))+/;

export function readTemplateSettings(template: string | null | undefined): TemplateSettings {
  const out: TemplateSettings = {};
  if (!template) return out;
  for (const m of template.matchAll(SETTING)) {
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (!value) continue;
    if (key === 'reference-style') out.referenceStyle = value;
    if (key === 'author-info') {
      const v = value.toLowerCase();
      if (v === 'none' || v === 'basic' || v === 'photos') out.authorInfo = v;
    }
  }
  return out;
}

// The comment lines at the top of a template, and the rest of it.
export function splitLeadingComments(template: string): { head: string; body: string } {
  const m = LEADING_COMMENTS.exec(template);
  return m ? { head: m[0], body: template.slice(m[0].length) } : { head: '', body: template };
}
