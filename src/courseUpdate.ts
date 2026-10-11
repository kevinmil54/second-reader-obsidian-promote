// Bringing an instructor's course update into a student's vault.
//
// An update is a folder with "Literature notes", "Attachments" and
// "Templates" inside it. The student puts the folder anywhere in their vault
// and runs one command. Each literature note in it is added if the student
// doesn't have that note yet, replaces the student's note if theirs is still
// blank, and is skipped if the student has written in their note or synced
// highlights into it. Images and other files are added only where nothing
// with that name exists. The update folder goes to the trash afterwards, so
// no second copy of any note stays in the vault.

export type NoteState = 'untouched' | 'highlights' | 'worked' | null;
export type NoteAction = 'add' | 'replace' | 'keep';

export const UPDATE_NOTES_FOLDER = 'Literature notes';
export const UPDATE_ATTACHMENTS_FOLDER = 'Attachments';
export const UPDATE_TEMPLATES_FOLDER = 'Templates';

// What to do with an incoming literature note, given the student's note of
// the same name (undefined when they have none). Only a note that is still
// nothing but the template is ever overwritten.
export function noteAction(existing: { state: NoteState } | undefined): NoteAction {
  if (!existing) return 'add';
  return existing.state === 'untouched' ? 'replace' : 'keep';
}

export type IncomingKind = 'note' | 'attachment' | 'template' | 'extra' | 'ignore';

// Sorts a file by its path inside the update folder ("Literature notes/x.md",
// "Attachments/k/fig.jpeg", ...).
export function incomingKind(relPath: string): IncomingKind {
  const parts = relPath.split('/');
  const name = parts[parts.length - 1];
  if (name.startsWith('.') || name === 'Thumbs.db') return 'ignore';
  if (parts[0] === UPDATE_NOTES_FOLDER && parts.length === 2 && name.endsWith('.md')) return 'note';
  if (parts[0] === UPDATE_ATTACHMENTS_FOLDER && parts.length >= 2) return 'attachment';
  if (parts[0] === UPDATE_TEMPLATES_FOLDER && parts.length === 2 && name.endsWith('.md')) return 'template';
  // A note for the whole vault (e.g. how the materials were made). The
  // update's own instructions stay behind.
  if (parts.length === 1 && name.endsWith('.md') && !/^read ?me/i.test(name)) return 'extra';
  return 'ignore';
}

export interface UpdateSummary {
  added: string[];
  replaced: string[];
  kept: string[];
  filesAdded: number;
  templatesUpdated: number;
}

export function summaryMessage(s: UpdateSummary): string {
  const n = (k: number, one: string, many = one + 's') => `${k} ${k === 1 ? one : many}`;
  const parts = [
    `Course update brought in: ${n(s.added.length, 'new literature note')}, ` +
      `${n(s.replaced.length, 'blank note')} replaced with the new version.`,
  ];
  if (s.kept.length) {
    parts.push(
      `Kept your own ${s.kept.length === 1 ? 'note' : 'notes'} for: ${s.kept.join('; ')}.`
    );
  }
  if (s.filesAdded) parts.push(`${n(s.filesAdded, 'image or file')} added.`);
  if (s.templatesUpdated) parts.push(`${n(s.templatesUpdated, 'template')} updated.`);
  return parts.join(' ');
}
