import { App, Modal, Setting, TFile, normalizePath } from 'obsidian';

import {
  isCitekeyNamed,
  nameNotesByTitle,
  namesNotesByCitekey,
  titleNamedPath,
} from './noteNaming';
import { ExportFormat } from './types';

export interface NamingFix {
  formats: ExportFormat[];
  renames: { file: TFile; to: string }[];
  // Notes whose title-based name is already taken by another file.
  blocked: { file: TFile; to: string }[];
}

export function findNamingFix(app: App, formats: ExportFormat[]): NamingFix {
  const fix: NamingFix = {
    formats: formats.filter((f) => namesNotesByCitekey(f.outputPathTemplate ?? '')),
    renames: [],
    blocked: [],
  };
  const claimed = new Set<string>();
  for (const file of app.vault.getMarkdownFiles()) {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
    const citekey = typeof fm?.citekey === 'string' ? fm.citekey : '';
    const title = typeof fm?.title === 'string' ? fm.title.trim() : '';
    if (!title || !isCitekeyNamed(file.basename, citekey)) continue;
    const to = normalizePath(titleNamedPath(file.path, title));
    if (to === file.path) continue;
    if (app.vault.getAbstractFileByPath(to) || claimed.has(to)) {
      fix.blocked.push({ file, to });
    } else {
      claimed.add(to);
      fix.renames.push({ file, to });
    }
  }
  return fix;
}

export function hasNamingFix(fix: NamingFix): boolean {
  return fix.formats.length > 0 || fix.renames.length > 0;
}

// Returns how many notes were renamed.
export async function applyNamingFix(
  app: App,
  fix: NamingFix,
  saveFormats: () => Promise<void>
): Promise<number> {
  for (const format of fix.formats) {
    format.outputPathTemplate = nameNotesByTitle(format.outputPathTemplate);
  }
  if (fix.formats.length) await saveFormats();

  let renamed = 0;
  for (const { file, to } of fix.renames) {
    // Through the file manager, so links to the note follow the rename.
    await app.fileManager.renameFile(file, to);
    renamed++;
  }
  return renamed;
}

const SHOWN_EXAMPLES = 5;

class NamingFixModal extends Modal {
  private decided = false;

  constructor(app: App, private fix: NamingFix, private resolve: (ok: boolean) => void) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    const { formats, renames, blocked } = this.fix;
    contentEl.createEl('h2', { text: 'Name your literature notes by title?' });
    contentEl.createEl('p', {
      text:
        'The class syllabus finds each reading\'s literature note by the reading\'s ' +
        'title, but your literature notes are named by citation key (like ' +
        '"cai2009"). Until they match, the syllabus links stay dimmed and ' +
        '"open pdf" can\'t find your notes.',
    });

    const list = contentEl.createEl('ul');
    if (formats.length) {
      list.createEl('li', {
        text: 'Change your import format so new literature notes are named by title.',
      });
    }
    if (renames.length) {
      list.createEl('li', {
        text: `Rename ${renames.length} existing literature note${renames.length === 1 ? '' : 's'} to the reading's title. Links to them are updated, and nothing inside the notes changes.`,
      });
      const examples = contentEl.createEl('ul');
      for (const { file, to } of renames.slice(0, SHOWN_EXAMPLES)) {
        examples.createEl('li', { text: `${file.basename} → ${to.split('/').pop()?.replace(/\.md$/, '')}` });
      }
      if (renames.length > SHOWN_EXAMPLES) {
        examples.createEl('li', { text: `…and ${renames.length - SHOWN_EXAMPLES} more` });
      }
    }
    if (blocked.length) {
      contentEl.createEl('p', {
        text: `${blocked.length} note${blocked.length === 1 ? '' : 's'} can't be renamed because a note with the title's name already exists (you may have imported the reading twice). Those are left as they are.`,
      });
    }

    new Setting(contentEl)
      .addButton((b) => b.setButtonText('Rename').setCta().onClick(() => this.finish(true)))
      .addButton((b) => b.setButtonText('Not now').onClick(() => this.finish(false)));
  }

  private finish(ok: boolean) {
    this.decided = true;
    this.resolve(ok);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
    if (!this.decided) this.resolve(false);
  }
}

export function askToFixNaming(app: App, fix: NamingFix): Promise<boolean> {
  return new Promise((resolve) => new NamingFixModal(app, fix, resolve).open());
}
