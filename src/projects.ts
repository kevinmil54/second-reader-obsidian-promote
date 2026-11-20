// Projects: a "New project" command (category, then name) and a timer for
// project letters. Start and Stop are links in the letter
// (obsidian://second-reader?project-timer=start|stop) and commands. Each
// session is one row in a CSV log in the vault, for later analysis.

import { App, Modal, Notice, Plugin, Setting, SuggestModal, TFile, TFolder, normalizePath } from 'obsidian';
import {
  Category,
  LETTER_TYPE,
  LogRow,
  PROJECT_NOTE_TYPES,
  ProjectSettings,
  BUILT_IN_LETTER,
  STALE_MINUTES,
  builtInProjectNote,
  clock,
  closeSession,
  day,
  dropSession,
  fillPlaceholders,
  fmtDur,
  isOpen,
  minutesBetween,
  newSession,
  outputTypeFor,
  parseCategories,
  parseLog,
  parseStamp,
  projectMinutes,
  sanitizeProjectName,
  serializeLog,
  withEntry,
  withTimerLinks,
} from './projectsCore';

interface Choice<T> {
  label: string;
  value: T;
}

class ChoiceModal<T> extends SuggestModal<Choice<T>> {
  private chosen = false;
  constructor(
    app: App,
    title: string,
    private choices: Choice<T>[],
    private resolve: (v: T | null) => void
  ) {
    super(app);
    this.setPlaceholder(title);
  }
  getSuggestions(query: string) {
    const q = query.toLowerCase();
    return this.choices.filter((c) => c.label.toLowerCase().includes(q));
  }
  renderSuggestion(c: Choice<T>, el: HTMLElement) {
    el.setText(c.label);
  }
  onChooseSuggestion(c: Choice<T>) {
    this.chosen = true;
    this.resolve(c.value);
  }
  onClose() {
    // Obsidian closes the modal before it reports the choice.
    window.setTimeout(() => {
      if (!this.chosen) this.resolve(null);
    }, 0);
  }
}

function choose<T>(app: App, title: string, choices: Choice<T>[]): Promise<T | null> {
  return new Promise((resolve) => new ChoiceModal(app, title, choices, resolve).open());
}

class NameModal extends Modal {
  private value = '';
  private done = false;
  constructor(app: App, private heading: string, private resolve: (v: string | null) => void) {
    super(app);
  }
  onOpen() {
    this.titleEl.setText(this.heading);
    const submit = () => {
      if (!this.value.trim()) return;
      this.done = true;
      this.resolve(this.value);
      this.close();
    };
    new Setting(this.contentEl).setName('Name').addText((t) => {
      t.onChange((v) => (this.value = v));
      t.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
      window.setTimeout(() => t.inputEl.focus(), 0);
    });
    new Setting(this.contentEl).addButton((b) => b.setButtonText('Create').setCta().onClick(submit));
  }
  onClose() {
    this.contentEl.empty();
    if (!this.done) this.resolve(null);
  }
}

const askName = (app: App, heading: string) =>
  new Promise<string | null>((resolve) => new NameModal(app, heading, resolve).open());

interface TemplaterLike {
  templater?: {
    create_new_note_from_template?: (
      template: TFile,
      folder: TFolder,
      filename: string,
      open: boolean
    ) => Promise<TFile | undefined>;
  };
}

export class ProjectTools {
  constructor(private plugin: Plugin, private settings: () => ProjectSettings) {}

  get app() {
    return this.plugin.app;
  }

  register() {
    this.plugin.addCommand({
      id: 'new-project',
      name: 'New project',
      callback: () => void this.newProject(),
    });
    this.plugin.addCommand({
      id: 'project-timer-start',
      name: 'Start a session in this project letter',
      checkCallback: (checking) => {
        if (!this.activeLetter()) return false;
        if (!checking) void this.timer('start');
        return true;
      },
    });
    this.plugin.addCommand({
      id: 'project-timer-stop',
      name: 'Stop the session in this project letter',
      checkCallback: (checking) => {
        if (!this.activeLetter()) return false;
        if (!checking) void this.timer('stop');
        return true;
      },
    });
    this.plugin.addCommand({
      id: 'project-letter-timer-links',
      name: 'Add or update Start/Stop links in this project letter',
      checkCallback: (checking) => {
        const f = this.activeLetter();
        if (!f) return false;
        if (!checking) void this.app.vault.process(f, withTimerLinks);
        return true;
      },
    });
  }

  categories(): Category[] {
    const s = this.settings();
    return parseCategories(s.projectCategories, s);
  }

  // ---- new project ----

  async newProject() {
    try {
      const cats = this.categories();
      if (!cats.length) {
        new Notice('Add project categories in Settings > Second Reader first.');
        return;
      }
      const cat = await choose(
        this.app,
        'Category for the new project',
        cats.map((c) => ({ label: c.name, value: c }))
      );
      if (!cat) return;
      const raw = await askName(this.app, `New ${cat.name} project`);
      const name = sanitizeProjectName(raw ?? '');
      if (!name) return;
      const folderPath = normalizePath(`${cat.folder}/${name}`);
      if (this.app.vault.getAbstractFileByPath(folderPath)) {
        new Notice(`${folderPath} already exists.`);
        return;
      }
      await this.ensureFolder(folderPath);
      const folder = this.app.vault.getAbstractFileByPath(folderPath) as TFolder;
      const today = day(new Date());

      const note = await this.createProjectNote(cat, name, folder, today);
      await this.app.fileManager.processFrontMatter(note, (fm) => {
        fm.category = [cat.name];
        if (fm.type === 'project') fm.project = name;
      });

      const letterTemplate = this.fileAt(this.settings().projectLetterTemplatePath);
      const letterText = withTimerLinks(
        fillPlaceholders(
          letterTemplate ? await this.app.vault.read(letterTemplate) : BUILT_IN_LETTER,
          { date: today, project: name, topics: '', title: `${name} - letter` }
        )
      );
      await this.app.vault.create(normalizePath(`${folderPath}/${name} - letter.md`), letterText);

      await this.app.workspace.getLeaf(false).openFile(note);
      new Notice(`New project: ${folderPath}`);
    } catch (e) {
      console.error('Second Reader: new project failed', e);
      new Notice(`Couldn't make the project: ${e instanceof Error ? e.message : String(e)}`, 10000);
    }
  }

  // Templater templates go through Templater, with the name, category and
  // output type in window.srNewProject so the template can skip its prompts.
  // Plain templates get {{title}}, {{date}}, {{project}} and {{category}}.
  private async createProjectNote(cat: Category, name: string, folder: TFolder, today: string) {
    const template = this.fileAt(cat.template);
    const path = normalizePath(`${folder.path}/${name}.md`);
    if (!template) return this.app.vault.create(path, builtInProjectNote(name, cat.name, today));
    const text = await this.app.vault.read(template);
    if (text.includes('<%')) {
      const tp = (this.app as unknown as { plugins?: { plugins?: Record<string, TemplaterLike> } })
        .plugins?.plugins?.['templater-obsidian'];
      const templater = tp?.templater;
      const create = templater?.create_new_note_from_template;
      if (templater && create) {
        const w = window as unknown as { srNewProject?: unknown };
        w.srNewProject = { name, category: cat.name, outputType: outputTypeFor(cat.name) };
        try {
          const f = await create.call(templater, template, folder, name, false);
          if (f) return f;
        } finally {
          delete w.srNewProject;
        }
      }
      new Notice(`${cat.template} needs Templater; used a plain project note instead.`);
      return this.app.vault.create(path, builtInProjectNote(name, cat.name, today));
    }
    return this.app.vault.create(
      path,
      fillPlaceholders(text, { title: name, project: name, category: cat.name, date: today })
    );
  }

  // ---- timer ----

  activeLetter(): TFile | null {
    const f = this.app.workspace.getActiveFile();
    if (!f || f.extension !== 'md') return null;
    const fm = this.app.metadataCache.getFileCache(f)?.frontmatter;
    return fm?.type === LETTER_TYPE ? f : null;
  }

  private projectInfo(file: TFile) {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const project = String(fm.project || file.parent?.name || file.basename);
    let category = '';
    for (const f of file.parent?.children ?? []) {
      if (f === file || !(f instanceof TFile) || f.extension !== 'md') continue;
      const ff = this.app.metadataCache.getFileCache(f)?.frontmatter;
      if (ff && PROJECT_NOTE_TYPES.includes(ff.type)) {
        const c = ff.category;
        category = Array.isArray(c) ? c.join('; ') : String(c ?? '');
        break;
      }
    }
    return { project, category };
  }

  private async readLog(): Promise<LogRow[]> {
    const path = normalizePath(this.settings().projectTimeLog);
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(path))) return [];
    return parseLog(await adapter.read(path));
  }

  private async writeLog(rows: LogRow[]) {
    const path = normalizePath(this.settings().projectTimeLog);
    const dir = path.split('/').slice(0, -1).join('/');
    if (dir && !(await this.app.vault.adapter.exists(dir))) await this.app.vault.createFolder(dir);
    await this.app.vault.adapter.write(path, serializeLog(rows));
  }

  async timer(action: 'start' | 'stop', now = new Date()) {
    try {
      const file = this.activeLetter();
      if (!file) {
        new Notice('Open a project letter to use the timer.');
        return;
      }
      if (action === 'start') await this.start(file, now);
      else await this.stop(file, now);
    } catch (e) {
      console.error('Second Reader: project timer failed', e);
      new Notice(`Timer problem: ${e instanceof Error ? e.message : String(e)}`, 10000);
    }
  }

  private async start(file: TFile, now: Date) {
    const info = this.projectInfo(file);
    const rows = await this.readLog();
    for (const r of rows.filter(isOpen)) {
      const started = parseStamp(r.start) ?? now;
      const min = minutesBetween(started, now);
      if (r.letter === file.path && min < STALE_MINUTES) {
        new Notice(`A session is already running (${fmtDur(min)} so far).`);
        return;
      }
      const when = day(started) === day(now) ? clock(started) : `${day(started)} ${clock(started)}`;
      const c = await choose(this.app, `A session is still open: ${r.project}, started ${when}`, [
        { label: `Close it now (${fmtDur(min)})`, value: 'close' },
        { label: "It ended earlier; don't count it", value: 'drop' },
        { label: 'Cancel', value: 'cancel' },
      ]);
      if (!c || c === 'cancel') return;
      if (c === 'close') closeSession(r, now);
      else dropSession(r);
    }
    rows.push(newSession(info.project, info.category, file.path, now));
    await this.writeLog(rows);
    await this.app.vault.process(file, (text) => withEntry(text, now));
    new Notice(`Started at ${clock(now)}.`, 3000);
  }

  private async stop(file: TFile, now: Date) {
    const info = this.projectInfo(file);
    const rows = await this.readLog();
    const mine = rows.filter((r) => isOpen(r) && r.letter === file.path).pop();
    if (mine) {
      const min = minutesBetween(parseStamp(mine.start) ?? now, now);
      if (min > STALE_MINUTES) {
        const c = await choose(this.app, 'This session has been open a long time', [
          { label: `Count it (${fmtDur(min)})`, value: 'count' },
          { label: "I forgot to stop; don't count it", value: 'drop' },
          { label: 'Cancel', value: 'cancel' },
        ]);
        if (!c || c === 'cancel') return;
        if (c === 'drop') {
          dropSession(mine);
          await this.writeLog(rows);
          new Notice('Session not counted.');
          return;
        }
      }
      closeSession(mine, now);
      await this.writeLog(rows);
      new Notice(
        `Session: ${fmtDur(min)}. ${info.project}: ${fmtDur(projectMinutes(rows, info.project))} in all.`,
        8000
      );
      return;
    }
    const last = rows.filter((r) => r.letter === file.path && r.minutes !== '').pop();
    if (last) {
      const d = parseStamp(last.start);
      new Notice(
        `Last session: ${fmtDur(Number(last.minutes))}${d ? ` (${day(d)})` : ''}. ` +
          `${info.project}: ${fmtDur(projectMinutes(rows, info.project))} in all.`,
        8000
      );
    } else new Notice('No sessions recorded for this letter yet.');
  }

  // ---- helpers ----

  private fileAt(path: string): TFile | null {
    if (!path) return null;
    const f = this.app.vault.getAbstractFileByPath(normalizePath(path));
    return f instanceof TFile ? f : null;
  }

  private async ensureFolder(path: string) {
    const parts = normalizePath(path).split('/');
    for (let i = 1; i <= parts.length; i++) {
      const p = parts.slice(0, i).join('/');
      if (!this.app.vault.getAbstractFileByPath(p)) await this.app.vault.createFolder(p);
    }
  }
}
