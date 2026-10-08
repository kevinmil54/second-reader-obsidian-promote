// The vault side of packaging a week's literature notes: finding the notes,
// asking for the student's name once, writing the zip, and showing it.

import JSZip from 'jszip';
import {
  App,
  FileSystemAdapter,
  Modal,
  Notice,
  Setting,
  SuggestModal,
  TFile,
  normalizePath,
} from 'obsidian';

import {
  UPLOADS_FOLDER,
  WeekSection,
  courseLabel,
  findWeekSections,
  linksInWeek,
  packageName,
} from './weekPackage';

export interface WeekPackageHost {
  app: App;
  getStudentName(): string;
  setStudentName(name: string): Promise<void>;
}

function isLiteratureNote(app: App, file: TFile): boolean {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  if (!fm) return false;
  if (typeof fm.citekey === 'string' && fm.citekey.trim()) return true;
  const tags = fm.tags;
  const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(/[,\s]+/) : [];
  return list.some((t: unknown) => String(t).replace(/^#/, '') === 'literature-note');
}

class StudentNameModal extends Modal {
  private value = '';
  private done = false;
  constructor(app: App, private resolve: (name: string | null) => void) {
    super(app);
  }
  onOpen() {
    this.titleEl.setText('Your name for uploads');
    this.contentEl.createEl('p', {
      text: 'Second Reader puts your name in the zip file so your instructor can tell whose notes are whose. You only need to enter it once; you can change it later in Settings > Second Reader.',
    });
    const submit = () => {
      const name = this.value.trim();
      if (!name) return;
      this.done = true;
      this.resolve(name);
      this.close();
    };
    new Setting(this.contentEl).setName('Name').addText((t) => {
      t.setPlaceholder('First Last').onChange((v) => (this.value = v));
      t.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
      window.setTimeout(() => t.inputEl.focus(), 0);
    });
    new Setting(this.contentEl).addButton((b) =>
      b.setButtonText('Save and package').setCta().onClick(submit)
    );
  }
  onClose() {
    this.contentEl.empty();
    if (!this.done) this.resolve(null);
  }
}

function askStudentName(app: App): Promise<string | null> {
  return new Promise((resolve) => new StudentNameModal(app, resolve).open());
}

class WeekChooser extends SuggestModal<WeekSection> {
  constructor(app: App, private weeks: WeekSection[], private choose: (w: WeekSection) => void) {
    super(app);
    this.setPlaceholder('Which week’s literature notes?');
  }
  getSuggestions(query: string) {
    const q = query.toLowerCase();
    return this.weeks.filter((w) => w.heading.toLowerCase().includes(q));
  }
  renderSuggestion(w: WeekSection, el: HTMLElement) {
    el.setText(w.heading);
  }
  onChooseSuggestion(w: WeekSection) {
    this.choose(w);
  }
}

// Command palette route: offers the weeks of the syllabus that's open.
export function chooseWeekAndPackage(host: WeekPackageHost, syllabus: TFile, text: string) {
  const weeks = findWeekSections(text).filter((s) => linksInWeek(text, s.week).length);
  if (!weeks.length) {
    new Notice('This note has no "Week" headings with readings under them. Open your syllabus and try again.');
    return;
  }
  new WeekChooser(host.app, weeks, (w) => packageWeek(host, w.week, syllabus)).open();
}

// Resolves the syllabus named in a link, falling back to the open note.
export function findSyllabus(app: App, linktext: string | undefined): TFile | null {
  const active = app.workspace.getActiveFile();
  if (linktext) {
    const f = app.metadataCache.getFirstLinkpathDest(linktext, active?.path ?? '');
    if (f) return f;
  }
  return active && active.extension === 'md' ? active : null;
}

function reveal(app: App, vaultPath: string) {
  const adapter = app.vault.adapter;
  if (!(adapter instanceof FileSystemAdapter)) return;
  try {
    require('electron').shell.showItemInFolder(adapter.getFullPath(vaultPath));
  } catch (e) {
    console.error('Second Reader: could not show the zip', e);
  }
}

async function ensureFolder(app: App, path: string) {
  if (!app.vault.getAbstractFileByPath(path)) await app.vault.createFolder(path);
}

export async function packageWeek(host: WeekPackageHost, week: number, syllabus: TFile) {
  const { app } = host;
  const text = await app.vault.read(syllabus);
  const section = findWeekSections(text).find((s) => s.week === week);
  if (!section) {
    new Notice(`"${syllabus.basename}" has no Week ${week} heading.`);
    return;
  }

  const notes: TFile[] = [];
  const missing: string[] = [];
  for (const { target, reading } of linksInWeek(text, week)) {
    const dest = app.metadataCache.getFirstLinkpathDest(target, syllabus.path);
    if (!dest) {
      // Only readings count as missing; a link to anything else is skipped.
      if (reading) missing.push(target);
    } else if (
      dest.extension === 'md' &&
      (reading || isLiteratureNote(app, dest)) &&
      !notes.includes(dest)
    ) {
      notes.push(dest);
    }
  }

  if (!notes.length) {
    new Notice(
      `You don't have any literature notes for Week ${week} yet, so there is nothing to package.`,
      10000
    );
    return;
  }

  let student = host.getStudentName().trim();
  if (!student) {
    const answer = await askStudentName(app);
    if (!answer) return;
    student = answer;
    await host.setStudentName(student);
  }

  const course = courseLabel(
    app.metadataCache.getFileCache(syllabus)?.frontmatter?.course,
    syllabus.basename
  );
  const name = packageName(course, week, student);

  // The notes are copied into a folder inside the zip, not inside the vault:
  // a second copy of each note in the vault would make [[links]] ambiguous.
  const zip = new JSZip();
  const folder = zip.folder(name)!;
  const added = new Set<string>();
  for (const note of notes) {
    folder.file(`${note.basename}.md`, await app.vault.read(note));
    for (const embed of app.metadataCache.getFileCache(note)?.embeds ?? []) {
      const file = app.metadataCache.getFirstLinkpathDest(
        embed.link.split('#')[0].split('|')[0],
        note.path
      );
      if (!file || file.extension === 'md' || added.has(file.path)) continue;
      added.add(file.path);
      folder.file(`attachments/${file.name}`, await app.vault.readBinary(file));
    }
  }

  await ensureFolder(app, UPLOADS_FOLDER);
  const zipPath = normalizePath(`${UPLOADS_FOLDER}/${name}.zip`);
  const data = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  await app.vault.adapter.writeBinary(zipPath, data);

  const parts = [
    `Packaged ${notes.length} literature note${notes.length === 1 ? '' : 's'} into "${name}.zip" in your ${UPLOADS_FOLDER} folder. Upload that file.`,
  ];
  if (missing.length) {
    parts.push(
      `Not included because you haven't made ${missing.length === 1 ? 'this note' : 'these notes'} yet: ${missing.join('; ')}.`
    );
  }
  new Notice(parts.join(' '), 15000);
  reveal(app, zipPath);
}
