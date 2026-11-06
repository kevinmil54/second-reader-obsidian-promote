/*
 * Second Reader: synthesis notes.
 *
 * Watches permanent notes (frontmatter tag "permanent-note") and their
 * `topics:` property. When a topic reaches the minimum number of permanent
 * notes and has no synthesis note, a note is created for it. Each synthesis
 * note's "Permanent notes on this topic" list is kept current inside a
 * marked block; nothing else in the note is ever changed.
 *
 * Only synthesis notes that already have the marked block are refreshed
 * automatically. A note the student wrote without it is left alone until
 * they run "Add or refresh the permanent-notes list in this note".
 */

import { Notice, Plugin, TAbstractFile, TFile, debounce, normalizePath } from 'obsidian';

import { ensureFolder, sanitizeFilename } from './promote';
import {
  NOTES_HEADING,
  TopicNote,
  builtInSynthesisBody,
  dropNotesQuery,
  fillSynthesisTemplate,
  groupByTopic,
  hasNotesBlock,
  renderNotesBlock,
  synthesisTitle,
  topicsToCreate,
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

export class Synthesizer {
  private running = false;
  private pendingTopics = new Set<string>();
  private run = debounce(() => this.runPass(), 1500, true);

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
      id: 'refresh-synthesis-list',
      name: 'Add or refresh the permanent-notes list in this synthesis note',
      checkCallback: (checking) => {
        const file = app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') return false;
        const topic = this.topicOf(file);
        if (!topic) return false;
        if (!checking) {
          this.refreshOne(file, true).then((changed) =>
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

  // --- reading the vault ---------------------------------------------------

  private isPermanent(file: TFile): boolean {
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const tags = asList(cache?.frontmatter?.tags);
    return tags.some((t) => String(t).toLowerCase() === PERMANENT_NOTE_TAG);
  }

  private topicsOf(file: TFile): string[] {
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const raw = cache?.frontmatter?.topics;
    return asList(raw).flatMap((t) => String(t).split(',')).map((t) => t.trim());
  }

  private permanentNotes(): TopicNote[] {
    const out: TopicNote[] = [];
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      if (!this.isPermanent(file)) continue;
      const topics = this.topicsOf(file);
      if (topics.length) out.push({ path: file.path, name: file.basename, topics });
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
    if (file.extension !== 'md' || !this.isPermanent(file)) return;
    for (const t of this.topicsOf(file)) this.pendingTopics.add(t.toLowerCase());
    this.run();
  }

  private fileGone(file: TAbstractFile) {
    if (!(file instanceof TFile) || file.extension !== 'md') return;
    this.run();
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
        await this.createSynthesisNote(group.topic, renderNotesBlock(group.notes));
        made.push(group.topic);
        const created = new Set((s._synthesisCreatedTopics || []).map((t) => t.toLowerCase()));
        created.add(group.topic.toLowerCase());
        s._synthesisCreatedTopics = Array.from(created);
      } catch (e) {
        console.error('Second Reader synthesis failed:', e);
        new Notice(`Second Reader: couldn't create a synthesis note for “${group.topic}” — ${e.message}`);
      }
    }
    if (made.length) await this.save();
    return made;
  }

  private async createSynthesisNote(topic: string, block: string) {
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

    body = withNotesBlock(dropNotesQuery(body), block);
    return await app.vault.create(path, body);
  }

  // --- refreshing ----------------------------------------------------------

  private blockFor(topic: string): string {
    const group = groupByTopic(this.permanentNotes()).get(topic.toLowerCase());
    return renderNotesBlock(group ? group.notes : []);
  }

  // Refreshes the list in every synthesis note that already has the block.
  private async refreshAll() {
    const groups = groupByTopic(this.permanentNotes());
    for (const [key, file] of this.synthesisNotes()) {
      const group = groups.get(key);
      await this.refreshFile(file, renderNotesBlock(group ? group.notes : []), false);
    }
  }

  // force: add the block even if the note doesn't have one yet.
  private async refreshOne(file: TFile, force: boolean): Promise<boolean> {
    const topic = this.topicOf(file);
    if (!topic) return false;
    return this.refreshFile(file, this.blockFor(topic), force);
  }

  private async refreshFile(file: TFile, block: string, force: boolean): Promise<boolean> {
    const app = this.plugin.app;
    const text = await app.vault.read(file);
    if (!force && !hasNotesBlock(text)) return false;
    const next = withNotesBlock(text, block);
    if (next === text) return false;
    await app.vault.modify(file, next);
    return true;
  }
}

export { NOTES_HEADING };
