import { errorMessage } from './errors';
/*
 * Second Reader: synthesis notes.
 *
 * Watches permanent notes (frontmatter tag "permanent-note") and their
 * `topics:` property. When a topic reaches the minimum number of permanent
 * notes and has no synthesis note, a note is created for it. Each synthesis
 * note's "Permanent notes not yet used" list is kept current inside a
 * marked block; nothing else in the note is ever changed. The list holds the
 * permanent notes the synthesis note doesn't link to yet, so it shrinks as the
 * student cites notes in their own writing.
 *
 * Only synthesis notes that already have the marked block are refreshed
 * automatically. A note the student wrote without it is left alone until
 * they run "Add or refresh the permanent-notes list in this note".
 */

import { App, Editor, FuzzySuggestModal, Notice, Plugin, TAbstractFile, TFile, debounce, normalizePath } from 'obsidian';

import { ensureFolder, sanitizeFilename } from './promote';
import {
  NOTES_HEADING,
  TopicNote,
  blockForText,
  builtInSynthesisBody,
  citationFor,
  dropNotesQuery,
  fillSynthesisTemplate,
  groupByTopic,
  hasNotesBlock,
  orderForProject,
  synthesisTitle,
  topicsToCreate,
  unusedNotes,
  withNotesBlock,
} from './synthesisCore';

const PERMANENT_NOTE_TAG = 'permanent-note';

export interface SynthesisSettings {
  synthesisFolder: string;
  synthesisTemplatePath: string;
  synthesisMinNotes: number;
  synthesisAutoCreate: boolean;
  // Topics (lower case) the plugin has already made a note for.
  _synthesisCreatedTopics?: string[];
}

export const DEFAULT_SYNTHESIS_SETTINGS: SynthesisSettings = {
  synthesisFolder: 'Synthesis notes',
  synthesisTemplatePath: 'Templates/Synthesis Note Template.md',
  synthesisMinNotes: 4,
  synthesisAutoCreate: true,
  _synthesisCreatedTopics: [],
};

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

class NotePicker extends FuzzySuggestModal<TopicNote> {
  constructor(app: App, private notes: TopicNote[], private choose: (n: TopicNote) => void) {
    super(app);
    this.setPlaceholder('Cite which permanent note?');
  }
  getItems() {
    return this.notes;
  }
  getItemText(n: TopicNote) {
    return n.title || n.name;
  }
  onChooseItem(n: TopicNote) {
    this.choose(n);
  }
}

export class Synthesizer {
  private running = false;
  private pendingTopics = new Set<string>();
  private run = debounce(() => this.runPass(), 1500, true);
  // Synthesis notes the student has edited: their list is refreshed once they
  // stop typing, since a newly linked note leaves the list.
  private pendingSynthesis = new Set<string>();
  private runSynthesis = debounce(() => this.refreshEdited(), 3000, true);

  constructor(
    private plugin: Plugin,
    private settings: () => SynthesisSettings,
    private save: () => Promise<void>
  ) {}

  register() {
    const app = this.plugin.app;
    this.plugin.registerEvent(
      app.metadataCache.on('changed', (file) => this.noteChanged(file))
    );
    this.plugin.registerEvent(
      app.vault.on('delete', (file) => this.fileGone(file))
    );
    this.plugin.registerEvent(
      app.vault.on('rename', (file) => this.fileGone(file))
    );

    this.plugin.addCommand({
      id: 'create-synthesis-notes',
      name: 'Create synthesis notes for topics with enough permanent notes',
      callback: async () => {
        const made = await this.createReady(null, false);
        await this.refreshAll();
        new Notice(
          made.length
            ? `Created ${made.length} synthesis note${made.length === 1 ? '' : 's'}: ${made.join(', ')}.`
            : `No topic has ${this.settings().synthesisMinNotes} or more permanent notes without a synthesis note.`,
          8000
        );
      },
    });

    this.plugin.addCommand({
      id: 'cite-permanent-note',
      name: 'Cite a permanent note here (in a synthesis or project note)',
      editorCheckCallback: (checking, editor, view) => {
        const file = view.file;
        if (!file) return false;
        const synthesis = !!this.topicOf(file);
        if (!synthesis && !this.isProject(file)) return false;
        if (!checking) this.citeNote(editor, file, synthesis);
        return true;
      },
    });

    this.plugin.addCommand({
      id: 'refresh-synthesis-list',
      name: 'Add or refresh the permanent-notes list in this synthesis note',
      checkCallback: (checking) => {
        const file = app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') return false;
        const topic = this.topicOf(file);
        if (!topic) return false;
        if (!checking) {
          void this.refreshOne(file, true).then((changed) =>
            new Notice(
              changed
                ? 'Updated the list of permanent notes in this note.'
                : 'The list of permanent notes is already up to date.'
            )
          );
        }
        return true;
      },
    });
  }

  // Offers the permanent notes on this note's topic that it does not link to
  // yet and inserts a link at the cursor. Selected text becomes the link text;
  // otherwise the title is inserted with the title selected, ready to retype.
  private citeNote(editor: Editor, file: TFile, synthesis: boolean) {
    const text = editor.getValue();
    const candidates = synthesis
      ? this.notesFor(this.topicOf(file))
      : orderForProject(this.allPermanentNotes(), this.synthesisTopicsOf(file));
    const unused = unusedNotes(candidates, text);
    if (!unused.length) {
      new Notice(
        synthesis
          ? 'Every permanent note on this topic is already linked in this note.'
          : 'Every permanent note is already linked in this note.'
      );
      return;
    }
    const from = editor.getCursor('from');
    const to = editor.getCursor('to');
    const selected = editor.getSelection();
    new NotePicker(this.plugin.app, unused, (note) => {
      const cite = citationFor(note, selected);
      editor.replaceRange(cite.text, from, to);
      if (!selected && cite.aliasFrom >= 0) {
        editor.setSelection(
          { line: from.line, ch: from.ch + cite.aliasFrom },
          { line: from.line, ch: from.ch + cite.aliasTo }
        );
      } else {
        editor.setCursor({ line: from.line, ch: from.ch + cite.text.length });
      }
    }).open();
  }

  private isProject(file: TFile): boolean {
    const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    return String(fm?.type ?? '').toLowerCase() === 'project';
  }

  // Topics of the synthesis notes listed in a project note's `synthesis:` property.
  private synthesisTopicsOf(file: TFile): Set<string> {
    const cache = this.plugin.app.metadataCache;
    const out = new Set<string>();
    for (const item of asList(cache.getFileCache(file)?.frontmatter?.synthesis)) {
      const m = /\[\[([^\]|#]+)/.exec(String(item));
      if (!m) continue;
      const target = cache.getFirstLinkpathDest(m[1].trim(), file.path);
      const topic = target ? this.topicOf(target) : '';
      if (topic) out.add(topic.toLowerCase());
    }
    return out;
  }

  // --- reading the vault ---------------------------------------------------

  private isPermanent(file: TFile): boolean {
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const tags = asList(cache?.frontmatter?.tags);
    return tags.some((t) => String(t).toLowerCase() === PERMANENT_NOTE_TAG);
  }

  private topicsOf(file: TFile): string[] {
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const raw: unknown = cache?.frontmatter?.topics;
    return asList(raw).flatMap((t) => String(t).split(',')).map((t) => t.trim());
  }

  private permanentNotes(): TopicNote[] {
    return this.allPermanentNotes().filter((n) => n.topics.length > 0);
  }

  // Every permanent note, including those with no topics.
  private allPermanentNotes(): TopicNote[] {
    const out: TopicNote[] = [];
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      if (!this.isPermanent(file)) continue;
      const title: unknown =
        this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.title;
      out.push({
        path: file.path,
        name: file.basename,
        title: typeof title === 'string' ? title : undefined,
        topics: this.topicsOf(file),
      });
    }
    return out;
  }

  // The topic a synthesis note is about, or '' if the file isn't one.
  private topicOf(file: TFile): string {
    const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    const topic = fm && fm.topic ? String(fm.topic).trim() : '';
    if (!topic) return '';
    const inFolder =
      !!this.settings().synthesisFolder &&
      file.path.startsWith(normalizePath(this.settings().synthesisFolder) + '/');
    const typed = String(fm?.type ?? '').toLowerCase() === 'synthesis';
    return inFolder || typed ? topic : '';
  }

  private synthesisNotes(): Map<string, TFile> {
    const out = new Map<string, TFile>();
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      const topic = this.topicOf(file);
      if (topic && !out.has(topic.toLowerCase())) out.set(topic.toLowerCase(), file);
    }
    return out;
  }

  // --- reacting to changes -------------------------------------------------

  private noteChanged(file: TFile) {
    if (file.extension !== 'md') return;
    if (this.topicOf(file)) {
      this.pendingSynthesis.add(file.path);
      this.runSynthesis();
      return;
    }
    if (!this.isPermanent(file)) return;
    for (const t of this.topicsOf(file)) this.pendingTopics.add(t.toLowerCase());
    this.run();
  }

  private fileGone(file: TAbstractFile) {
    if (!(file instanceof TFile) || file.extension !== 'md') return;
    this.run();
  }

  private async refreshEdited() {
    const paths = Array.from(this.pendingSynthesis);
    this.pendingSynthesis.clear();
    for (const path of paths) {
      const file = this.plugin.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) await this.refreshOne(file, false).catch(console.error);
    }
  }

  private async runPass() {
    if (this.running) return;
    this.running = true;
    try {
      const only = new Set(this.pendingTopics);
      this.pendingTopics.clear();
      if (this.settings().synthesisAutoCreate && only.size) {
        const made = await this.createReady(only, true);
        for (const topic of made) {
          new Notice(`Second Reader: created a synthesis note for “${topic}”.`, 8000);
        }
      }
      await this.refreshAll();
    } catch (e) {
      console.error('Second Reader synthesis:', e);
    } finally {
      this.running = false;
    }
  }

  // --- creating ------------------------------------------------------------

  // Returns the topics a note was made for.
  private async createReady(only: Set<string> | null, automatic: boolean): Promise<string[]> {
    const s = this.settings();
    const groups = groupByTopic(this.permanentNotes());
    const existing = new Set(this.synthesisNotes().keys());
    const ready = topicsToCreate({
      groups,
      existing,
      alreadyCreated: new Set((s._synthesisCreatedTopics || []).map((t) => t.toLowerCase())),
      minNotes: Math.max(1, s.synthesisMinNotes || 4),
      only,
      automatic,
    });

    const made: string[] = [];
    for (const group of ready) {
      try {
        await this.createSynthesisNote(group.topic, group.notes);
        made.push(group.topic);
        const created = new Set((s._synthesisCreatedTopics || []).map((t) => t.toLowerCase()));
        created.add(group.topic.toLowerCase());
        s._synthesisCreatedTopics = Array.from(created);
      } catch (e) {
        console.error('Second Reader synthesis failed:', e);
        new Notice(`Second Reader: couldn't create a synthesis note for “${group.topic}” — ${errorMessage(e)}`);
      }
    }
    if (made.length) await this.save();
    return made;
  }

  private async createSynthesisNote(topic: string, notes: TopicNote[]) {
    const app = this.plugin.app;
    const { synthesisFolder, synthesisTemplatePath } = this.settings();
    const folder = synthesisFolder ? normalizePath(synthesisFolder) : '';
    if (folder) await ensureFolder(app.vault, folder);

    const title = synthesisTitle(topic);
    const base = sanitizeFilename(title);
    let path = normalizePath(folder ? `${folder}/${base}.md` : `${base}.md`);
    for (let n = 2; app.vault.getAbstractFileByPath(path); n++) {
      path = normalizePath(folder ? `${folder}/${base} (${n}).md` : `${base} (${n}).md`);
    }
    const noteTitle = path.split('/').pop()!.replace(/\.md$/, '');

    const today = new Date().toISOString().slice(0, 10);
    let body: string | null = null;
    const templatePath = synthesisTemplatePath ? normalizePath(synthesisTemplatePath) : '';
    const templateFile = templatePath ? app.vault.getAbstractFileByPath(templatePath) : null;
    if (templateFile instanceof TFile) {
      body = fillSynthesisTemplate(await app.vault.read(templateFile), topic, noteTitle, today);
      if (body === null) {
        console.warn(
          `Second Reader synthesis: template "${templatePath}" has parts the plugin can't fill; using the built-in note.`
        );
      }
    }
    if (body === null) body = builtInSynthesisBody(topic, noteTitle, today);

    body = dropNotesQuery(body);
    body = withNotesBlock(body, blockForText(notes, body));
    return await app.vault.create(path, body);
  }

  // --- refreshing ----------------------------------------------------------

  private notesFor(topic: string): TopicNote[] {
    const group = groupByTopic(this.permanentNotes()).get(topic.toLowerCase());
    return group ? group.notes : [];
  }

  // Refreshes the list in every synthesis note that already has the block.
  private async refreshAll() {
    const groups = groupByTopic(this.permanentNotes());
    for (const [key, file] of this.synthesisNotes()) {
      const group = groups.get(key);
      await this.refreshFile(file, group ? group.notes : [], false);
    }
  }

  // force: add the block even if the note doesn't have one yet.
  private async refreshOne(file: TFile, force: boolean): Promise<boolean> {
    const topic = this.topicOf(file);
    if (!topic) return false;
    return this.refreshFile(file, this.notesFor(topic), force);
  }

  private async refreshFile(file: TFile, notes: TopicNote[], force: boolean): Promise<boolean> {
    let changed = false;
    await this.plugin.app.vault.process(file, (text) => {
      if (!force && !hasNotesBlock(text)) return text;
      const next = withNotesBlock(text, blockForText(notes, text));
      changed = next !== text;
      return next;
    });
    return changed;
  }
}

export { NOTES_HEADING };
