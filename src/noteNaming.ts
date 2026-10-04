// The class syllabus links to literature notes by the reading's title, but
// the setup guide once told students to name notes by citekey. These helpers
// find citekey-named notes and work out the name the import gives a note
// named by title, using the import's own file-name rules.

import path from 'path';

import { sanitizeFilePath } from './bbt/helpers';

const CITEKEY_VAR = /\{\{-?\s*citekey\s*-?\}\}/;

// Whether an import format's output path names the note itself (not just a
// folder) by citekey.
export function namesNotesByCitekey(outputPathTemplate: string): boolean {
  const name = outputPathTemplate.split('/').pop() ?? '';
  return CITEKEY_VAR.test(name);
}

export function nameNotesByTitle(outputPathTemplate: string): string {
  const parts = outputPathTemplate.split('/');
  parts[parts.length - 1] = parts[parts.length - 1].replace(CITEKEY_VAR, '{{title}}');
  return parts.join('/');
}

// A note is citekey-named if its file name is exactly its citekey — only
// those are renamed, so notes a student named themselves are left alone.
export function isCitekeyNamed(basename: string, citekey: string): boolean {
  const key = citekey.trim().replace(/^@/, '');
  return !!key && (basename === key || basename === `@${key}`);
}

// Vault path the note would have if imported with "{{title}}" in place of
// "{{citekey}}" — same folder, same character substitutions as the import.
export function titleNamedPath(currentPath: string, title: string): string {
  const dir = path.posix.dirname(currentPath);
  const joined = dir === '.' ? `${title}.md` : `${dir}/${title}.md`;
  return sanitizeFilePath(joined).split(path.sep).join('/');
}
