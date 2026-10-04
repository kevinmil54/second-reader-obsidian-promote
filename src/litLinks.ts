// Colors links to literature notes by how far the student has gotten with
// them (see litNoteState.ts), in reading view and in the editor. Notes that
// don't exist yet already show as unresolved links in Obsidian's own style.

import { RangeSetBuilder, StateEffect } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import {
  MarkdownPostProcessorContext,
  MarkdownView,
  Plugin,
  TAbstractFile,
  TFile,
  debounce,
  editorInfoField,
} from 'obsidian';

import currentTemplate from '../Templates/Literature Note Template - Zotero Import.md';
import { linktextOf } from './classCopy';
import {
  LitNoteState,
  buildBoilerplate,
  literatureNoteState,
  splitTemplateVersions,
} from './litNoteState';
import pastTemplates from './pastLiteratureTemplates.md';

export const STATE_CLASSES: Record<LitNoteState, string> = {
  untouched: 'sr-lit-untouched',
  highlights: 'sr-lit-highlights',
  worked: 'sr-lit-worked',
};
const ALL_CLASSES = Object.values(STATE_CLASSES);
const WIKILINK = /\[\[([^\]\n]+)\]\]/g;

export function isLiteratureNote(plugin: Plugin, file: TFile): boolean {
  const fm = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
  if (!fm) return false;
  if (typeof fm.citekey === 'string' && fm.citekey.trim()) return true;
  const tags = Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : [];
  return tags.some((t: unknown) => String(t).toLowerCase() === 'literature-note');
}

export class LiteratureLinkColors {
  private boilerplate = buildBoilerplate([
    currentTemplate,
    ...splitTemplateVersions(pastTemplates),
  ]);
  // null = not a literature note; missing = not computed yet.
  private states = new Map<string, LitNoteState | null>();
  private computing = new Set<string>();
  private refreshEffect = StateEffect.define<null>();
  private refreshSoon = debounce(() => this.refreshViews(), 250, true);

  constructor(private plugin: Plugin) {}

  register() {
    const { app } = this.plugin;
    this.plugin.registerMarkdownPostProcessor((el, ctx) =>
      this.decorateReadingView(el, ctx)
    );
    this.plugin.registerEditorExtension(this.editorExtension());
    this.plugin.registerEvent(
      app.metadataCache.on('changed', (file) => this.recompute(file))
    );
    this.plugin.registerEvent(
      app.vault.on('delete', (file) => this.forget(file.path))
    );
    this.plugin.registerEvent(
      app.vault.on('rename', (file, oldPath) => {
        this.forget(oldPath);
        this.recompute(file);
      })
    );
    // A link turns from unresolved to resolved when its note is created.
    this.plugin.registerEvent(
      app.metadataCache.on('resolved', () => this.refreshSoon())
    );
  }

  private forget(path: string) {
    if (this.states.delete(path)) this.refreshSoon();
  }

  // Cached state, or undefined while it's being worked out (views refresh
  // once it is).
  stateOf(file: TFile): LitNoteState | null | undefined {
    if (this.states.has(file.path)) return this.states.get(file.path);
    this.recompute(file);
    return undefined;
  }

  private async recompute(file: TAbstractFile) {
    if (!(file instanceof TFile) || file.extension !== 'md') return;
    if (this.computing.has(file.path)) return;
    this.computing.add(file.path);
    try {
      const state = isLiteratureNote(this.plugin, file)
        ? literatureNoteState(
            await this.plugin.app.vault.cachedRead(file),
            this.boilerplate
          )
        : null;
      if (this.states.get(file.path) !== state || !this.states.has(file.path)) {
        this.states.set(file.path, state);
        this.refreshSoon();
      }
    } finally {
      this.computing.delete(file.path);
    }
  }

  private classFor(linktext: string, sourcePath: string): string | null {
    const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(
      linktextOf(linktext),
      sourcePath
    );
    if (!dest) return null;
    const state = this.stateOf(dest);
    return state ? STATE_CLASSES[state] : null;
  }

  private colorAnchor(a: Element, sourcePath: string) {
    const href = a.getAttribute('data-href') ?? a.getAttribute('href');
    a.classList.remove(...ALL_CLASSES);
    if (!href) return;
    const cls = this.classFor(href, sourcePath);
    if (cls) a.classList.add(cls);
  }

  private decorateReadingView(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    el.querySelectorAll('a.internal-link').forEach((a) =>
      this.colorAnchor(a, ctx.sourcePath)
    );
  }

  // Re-color everything on screen: reading views directly (re-rendering them
  // would lose the scroll position), editors through a CodeMirror effect.
  refreshViews() {
    for (const leaf of this.plugin.app.workspace.getLeavesOfType('markdown')) {
      const view = leaf.view;
      if (!(view instanceof MarkdownView) || !view.file) continue;
      const sourcePath = view.file.path;
      view.containerEl
        .querySelectorAll('.markdown-reading-view a.internal-link, .markdown-preview-view a.internal-link')
        .forEach((a) => this.colorAnchor(a, sourcePath));
      const cm = (view.editor as any)?.cm as EditorView | undefined;
      cm?.dispatch({ effects: this.refreshEffect.of(null) });
    }
  }

  private editorExtension() {
    const colors = this;
    return ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = this.build(view);
        }
        update(u: ViewUpdate) {
          const refreshed = u.transactions.some((t) =>
            t.effects.some((e) => e.is(colors.refreshEffect))
          );
          if (u.docChanged || u.viewportChanged || refreshed) {
            this.decorations = this.build(u.view);
          }
        }
        build(view: EditorView): DecorationSet {
          const builder = new RangeSetBuilder<Decoration>();
          const sourcePath = view.state.field(editorInfoField, false)?.file?.path;
          if (sourcePath === undefined) return builder.finish();
          for (const { from, to } of view.visibleRanges) {
            const text = view.state.doc.sliceString(from, to);
            for (const m of text.matchAll(WIKILINK)) {
              const cls = colors.classFor(m[1], sourcePath);
              if (!cls) continue;
              const start = from + m.index;
              builder.add(start, start + m[0].length, Decoration.mark({ class: cls }));
            }
          }
          return builder.finish();
        }
      },
      { decorations: (v) => v.decorations }
    );
  }
}
