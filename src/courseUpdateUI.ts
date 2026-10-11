// The vault side of bringing in a course update: choosing the update folder,
// copying its files where they belong, and putting the folder in the trash.

import { App, FuzzySuggestModal, Notice, TFile, TFolder, normalizePath } from 'obsidian';

import {
  NoteState,
  UPDATE_NOTES_FOLDER,
  UpdateSummary,
  incomingKind,
  noteAction,
  summaryMessage,
} from './courseUpdate';

export interface CourseUpdateHost {
  app: App;
  noteState(file: TFile): Promise<NoteState>;
  // Re-reads the vault's templates, so a template that arrived with the
  // update counts as template text before notes are judged.
  reloadTemplates(extra: string[]): Promise<void>;
}

// Folders that look like an update: they hold a "Literature notes" folder
// and aren't the vault root.
export function findUpdateFolders(app: App): TFolder[] {
  return app.vault
    .getAllLoadedFiles()
    .filter((f): f is TFolder => f instanceof TFolder && !f.isRoot())
    .filter((f) => f.children.some((c) => c instanceof TFolder && c.name === UPDATE_NOTES_FOLDER));
}

class UpdateChooser extends FuzzySuggestModal<TFolder> {
  constructor(app: App, private folders: TFolder[], private choose: (f: TFolder) => void) {
    super(app);
    this.setPlaceholder('Which folder is the course update?');
  }
  getItems() {
    return this.folders;
  }
  getItemText(f: TFolder) {
    return f.path;
  }
  onChooseItem(f: TFolder) {
    this.choose(f);
  }
}

export function chooseAndApplyUpdate(host: CourseUpdateHost) {
  const folders = findUpdateFolders(host.app);
  if (!folders.length) {
    new Notice(
      'Put the course update folder (the one with "Literature notes" inside it) into your vault first, then run this again.',
      10000
    );
    return;
  }
  const run = (f: TFolder) =>
    applyCourseUpdate(host, f).catch((e) => {
      console.error('Second Reader: course update failed', e);
      new Notice(`Couldn't bring in the update: ${e?.message ?? e}`, 10000);
    });
  if (folders.length === 1) run(folders[0]);
  else new UpdateChooser(host.app, folders, run).open();
}

async function ensureFolder(app: App, path: string) {
  if (!path) return;
  const parts = normalizePath(path).split('/');
  let cur = '';
  for (const p of parts) {
    cur = cur ? `${cur}/${p}` : p;
    if (!app.vault.getAbstractFileByPath(cur)) await app.vault.createFolder(cur);
  }
}

function parentOf(path: string) {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

export async function applyCourseUpdate(host: CourseUpdateHost, folder: TFolder) {
  const { app } = host;
  const prefix = folder.path + '/';
  const incoming = app.vault.getFiles().filter((f) => f.path.startsWith(prefix));
  const rel = (f: TFile) => f.path.slice(prefix.length);
  const outside = (f: TFile) => !f.path.startsWith(prefix);

  const summary: UpdateSummary = { added: [], replaced: [], kept: [], filesAdded: 0, templatesUpdated: 0 };

  // Templates first, so blank notes made from them are recognized as blank.
  const templateTexts: string[] = [];
  for (const f of incoming.filter((f) => incomingKind(rel(f)) === 'template')) {
    const text = await app.vault.read(f);
    templateTexts.push(text);
    const dest = normalizePath(rel(f));
    const existing = app.vault.getAbstractFileByPath(dest);
    if (existing instanceof TFile) {
      if ((await app.vault.read(existing)) !== text) {
        await app.vault.modify(existing, text);
        summary.templatesUpdated++;
      }
    } else {
      await ensureFolder(app, parentOf(dest));
      await app.vault.create(dest, text);
      summary.templatesUpdated++;
    }
  }
  await host.reloadTemplates(templateTexts);

  // The student's literature notes, by name, wherever they keep them.
  const byName = new Map<string, TFile>();
  for (const f of app.vault.getMarkdownFiles()) {
    if (outside(f) && !byName.has(f.basename)) byName.set(f.basename, f);
  }

  for (const f of incoming.filter((f) => incomingKind(rel(f)) === 'note')) {
    const text = await app.vault.read(f);
    const mine = byName.get(f.basename);
    const action = noteAction(mine ? { state: await host.noteState(mine) } : undefined);
    if (action === 'add') {
      const dest = normalizePath(`${UPDATE_NOTES_FOLDER}/${f.name}`);
      await ensureFolder(app, UPDATE_NOTES_FOLDER);
      await app.vault.create(dest, text);
      summary.added.push(f.basename);
    } else if (action === 'replace' && mine) {
      await app.vault.modify(mine, text);
      summary.replaced.push(f.basename);
    } else {
      summary.kept.push(f.basename);
    }
  }

  for (const f of incoming) {
    const kind = incomingKind(rel(f));
    if (kind !== 'attachment' && kind !== 'extra') continue;
    const dest = normalizePath(rel(f));
    if (app.vault.getAbstractFileByPath(dest)) continue;
    await ensureFolder(app, parentOf(dest));
    await app.vault.createBinary(dest, await app.vault.readBinary(f));
    summary.filesAdded++;
  }

  // The update's copies would make every note name appear twice.
  await app.vault.trash(folder, true);
  new Notice(summaryMessage(summary) + ' The update folder was moved to the trash.', 20000);
  return summary;
}
