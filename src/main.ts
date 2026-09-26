import Fuse from 'fuse.js';
import {
  EditableFileView,
  Events,
  MarkdownView,
  Notice,
  Plugin,
  TFile,
  normalizePath,
} from 'obsidian';
import { shellPath } from 'shell-path';

import { DataExplorerView, viewType } from './DataExplorerView';
import { LoadingModal } from './bbt/LoadingModal';
import { getCAYW } from './bbt/cayw';
import { exportToMarkdown, renderCiteTemplate } from './bbt/export';
import {
  insertNotesIntoCurrentDoc,
  noteExportPrompt,
} from './bbt/exportNotes';
import './bbt/template.helpers';
import { setPluginDir } from './helpers';
import { DEFAULT_PROMOTE_SETTINGS, Promoter } from './promote';
import {
  applyTemplateUpgrade,
  askToUpgradeTemplates,
  findOutdatedTemplates,
} from './templateUpgradeUI';
import {
  currentVersion,
  downloadAndExtract,
  internalVersion,
} from './settings/AssetDownloader';
import { ZoteroConnectorSettingsTab } from './settings/settings';
import {
  CitationFormat,
  CiteKeyExport,
  ExportFormat,
  ZoteroConnectorSettings,
} from './types';

const SYNC_BUTTON_LABEL = 'Sync Zotero highlights into this note';
const citationCommandIDPrefix = 'zdc-';
const exportCommandIDPrefix = 'zdc-exp-';

// Plugins whose Zotero settings Second Reader imports on first run, in order
// of preference: the community Zotero Integration plugin students set up
// before, then the short-lived Nota Bene fork.
const LEGACY_ZOTERO_PLUGIN_IDS = [
  'obsidian-zotero-desktop-connector',
  'nota-bene-zotero',
];

const DEFAULT_SETTINGS: ZoteroConnectorSettings = {
  ...DEFAULT_PROMOTE_SETTINGS,
  database: 'Zotero',
  noteImportFolder: '',
  pdfExportImageDPI: 120,
  pdfExportImageFormat: 'jpg',
  pdfExportImageQuality: 90,
  citeFormats: [],
  exportFormats: [],
  citeSuggestTemplate: '[[{{citekey}}]]',
  openNoteAfterImport: false,
  whichNotesToOpenAfterImport: 'first-imported-note',
};

async function fixPath() {
  if (process.platform === 'win32') {
    return;
  }

  try {
    const path = await shellPath();

    process.env.PATH =
      path ||
      [
        './node_modules/.bin',
        '/.nodebrew/current/bin',
        '/usr/local/bin',
        process.env.PATH,
      ].join(':');
  } catch (e) {
    console.error(e);
  }
}

export default class ZoteroConnector extends Plugin {
  settings: ZoteroConnectorSettings;
  emitter: Events;
  fuse: Fuse<CiteKeyExport>;

  async onload() {
    setPluginDir(this.manifest.dir);
    await this.loadSettings();
    await this.importLegacyZoteroSettings();
    this.emitter = new Events();

    new Promoter(this, () => this.settings).register();
    this.app.workspace.onLayoutReady(() => {
      this.warnAboutLegacyPlugins();
      this.offerTemplateUpgrade('startup');
    });

    this.addCommand({
      id: 'update-literature-template',
      name: 'Update literature-note template',
      callback: () => this.offerTemplateUpgrade('command'),
    });

    this.updatePDFUtility();
    this.addSettingTab(new ZoteroConnectorSettingsTab(this.app, this));
    this.registerView(viewType, (leaf) => new DataExplorerView(this, leaf));

    this.settings.citeFormats.forEach((f) => {
      this.addFormatCommand(f);
    });

    this.settings.exportFormats.forEach((f) => {
      this.addExportCommand(f);
    });

    this.addCommand({
      id: 'zdc-insert-notes',
      name: 'Insert notes into current document',
      editorCallback: (editor) => {
        const database = {
          database: this.settings.database,
          port: this.settings.port,
        };
        noteExportPrompt(
          database,
          this.app.workspace.getActiveFile()?.parent.path
        ).then((notes) => {
          if (notes) {
            insertNotesIntoCurrentDoc(editor, notes);
          }
        });
      },
    });

    this.addCommand({
      id: 'nb-sync-highlights',
      name: 'Sync highlights into current note',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') return false;
        if (!checking) this.syncHighlights(file);
        return true;
      },
    });

    this.addRibbonIcon('highlighter', SYNC_BUTTON_LABEL, () => {
      const file = this.app.workspace.getActiveFile();
      if (file?.extension === 'md') {
        this.syncHighlights(file);
      } else {
        new Notice('Open a literature note first, then sync.');
      }
    });

    // The ribbon is easy to miss among other plugins' icons, so literature
    // notes also get the sync button in their own header, where students are
    // already looking.
    const refresh = () => this.refreshNoteHeaderButtons();
    this.registerEvent(this.app.workspace.on('file-open', refresh));
    this.registerEvent(this.app.workspace.on('layout-change', refresh));
    this.registerEvent(this.app.metadataCache.on('changed', refresh));
    this.app.workspace.onLayoutReady(refresh);

    this.addCommand({
      id: 'show-zotero-debug-view',
      name: 'Data explorer',
      callback: () => {
        this.activateDataExplorer();
      },
    });

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile) {
          this.emitter.trigger('fileUpdated', file);
        }
      })
    );

    app.workspace.trigger('parse-style-settings');

    fixPath();
  }

  onunload() {
    for (const el of this.noteHeaderButtons.values()) el.remove();
    this.noteHeaderButtons.clear();

    this.settings.citeFormats.forEach((f) => {
      this.removeFormatCommand(f);
    });

    this.settings.exportFormats.forEach((f) => {
      this.removeExportCommand(f);
    });

    this.app.workspace.detachLeavesOfType(viewType);
  }

  addFormatCommand(format: CitationFormat) {
    this.addCommand({
      id: `${citationCommandIDPrefix}${format.name}`,
      name: format.name,
      editorCallback: (editor) => {
        const database = {
          database: this.settings.database,
          port: this.settings.port,
        };
        if (format.format === 'template' && format.template.trim()) {
          renderCiteTemplate({
            database,
            format,
          }).then((res) => {
            if (typeof res === 'string') {
              editor.replaceSelection(res);
            }
          });
        } else {
          getCAYW(format, database).then((res) => {
            if (typeof res === 'string') {
              editor.replaceSelection(res);
            }
          });
        }
      },
    });
  }

  removeFormatCommand(format: CitationFormat) {
    (this.app as any).commands.removeCommand(
      `${this.manifest.id}:${citationCommandIDPrefix}${format.name}`
    );
  }

  addExportCommand(format: ExportFormat) {
    this.addCommand({
      id: `${exportCommandIDPrefix}${format.name}`,
      name: format.name,
      callback: async () => {
        // Importing still works with an old template (just without quotes),
        // so this only offers; it never blocks the import.
        await this.offerTemplateUpgrade('import', [format]);
        const database = {
          database: this.settings.database,
          port: this.settings.port,
        };
        this.openNotes(
          await exportToMarkdown({
            settings: this.settings,
            database,
            exportFormat: format,
          })
        );
      },
    });
  }

  removeExportCommand(format: ExportFormat) {
    (this.app as any).commands.removeCommand(
      `${this.manifest.id}:${exportCommandIDPrefix}${format.name}`
    );
  }

  async runImport(name: string, citekey: string, library: number = 1) {
    const format = this.settings.exportFormats.find((f) => f.name === name);

    if (!format) {
      throw new Error(`Error: Import format "${name}" not found`);
    }

    const database = {
      database: this.settings.database,
      port: this.settings.port,
    };

    if (citekey.startsWith('@')) citekey = citekey.substring(1);

    await exportToMarkdown(
      {
        settings: this.settings,
        database,
        exportFormat: format,
      },
      [{ key: citekey, library }]
    );
  }

  // Returns whether the relevant templates can import highlights afterwards.
  async offerTemplateUpgrade(
    trigger: 'startup' | 'command' | 'sync' | 'import',
    formats: ExportFormat[] = this.settings.exportFormats
  ): Promise<boolean> {
    const upgrades = await findOutdatedTemplates(this.app, formats);
    if (!upgrades.length) {
      if (trigger === 'command') {
        new Notice('Your literature-note template is already up to date.');
      }
      return true;
    }
    if (trigger === 'startup' && this.settings._templateUpgradeDeclinedAtStartup) {
      return false;
    }

    const reason =
      trigger === 'sync'
        ? "Your literature-note template is from an earlier version of Second Reader, so syncing can't bring in your Zotero highlights until the template is updated."
        : 'Your literature-note template is from an earlier version of Second Reader. Updating it lets your notes bring in Zotero highlights as quotes with page numbers.';

    if (!(await askToUpgradeTemplates(this.app, upgrades, reason))) {
      if (trigger === 'startup') {
        this.settings._templateUpgradeDeclinedAtStartup = true;
        await this.saveSettings();
      }
      new Notice(
        trigger === 'sync'
          ? 'Highlights weren\'t synced. Run "Second Reader: Update literature-note template" when you\'re ready, then sync again.'
          : 'No problem — run "Second Reader: Update literature-note template" whenever you\'re ready.',
        8000
      );
      return false;
    }

    for (const upgrade of upgrades) {
      try {
        const backup = await applyTemplateUpgrade(this.app, upgrade);
        new Notice(
          `Updated ${upgrade.file.path}. Your previous version was saved as ${backup}.`,
          10000
        );
      } catch (e) {
        console.error(e);
        new Notice(`Couldn't update ${upgrade.file.path}: ${e.message}`, 10000);
        return false;
      }
    }
    return true;
  }

  private noteHeaderButtons = new Map<MarkdownView, HTMLElement>();

  // A note can be synced only if it has a citekey to match against Zotero.
  isSyncableNote(file: TFile | null): boolean {
    if (!file || file.extension !== 'md') return false;
    const citekey = this.app.metadataCache.getFileCache(file)?.frontmatter?.citekey;
    return typeof citekey === 'string' && citekey.trim() !== '';
  }

  refreshNoteHeaderButtons() {
    const views = new Set<MarkdownView>();
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      if (leaf.view instanceof MarkdownView) views.add(leaf.view);
    }

    for (const [view, el] of this.noteHeaderButtons) {
      if (!views.has(view) || !this.isSyncableNote(view.file)) {
        el.remove();
        this.noteHeaderButtons.delete(view);
      }
    }

    for (const view of views) {
      if (this.noteHeaderButtons.has(view) || !this.isSyncableNote(view.file)) {
        continue;
      }
      // Reads view.file at click time: a view is reused as the student moves
      // between notes, and the button is removed when it's no longer valid.
      const el = view.addAction('highlighter', SYNC_BUTTON_LABEL, () => {
        if (view.file) this.syncHighlights(view.file);
      });
      el.addClass('second-reader-sync-button');
      this.noteHeaderButtons.set(view, el);
    }
  }

  // Import formats are how students configure the literature-note template;
  // prefer the one pointing at it, since a vault may have other formats.
  syncFormat(): ExportFormat | undefined {
    const formats = this.settings.exportFormats;
    return (
      formats.find((f) => /literature note/i.test(f.templatePath ?? '')) ??
      formats[0]
    );
  }

  private syncing = new Set<string>();

  async syncHighlights(file: TFile) {
    const citekey =
      this.app.metadataCache.getFileCache(file)?.frontmatter?.citekey;
    if (!citekey || typeof citekey !== 'string') {
      new Notice(
        `${file.basename} has no citekey in its frontmatter, so it can't be matched to a Zotero item.`
      );
      return;
    }

    const format = this.syncFormat();
    if (!format) {
      new Notice(
        'Set up an import format in the Second Reader settings first.'
      );
      return;
    }

    if (this.syncing.has(file.path)) return;
    // An old template renders no quotes block, so a sync would silently add
    // nothing.
    if (!(await this.offerTemplateUpgrade('sync', [format]))) return;
    this.syncing.add(file.path);
    try {
      await exportToMarkdown(
        {
          settings: this.settings,
          database: {
            database: this.settings.database,
            port: this.settings.port,
          },
          exportFormat: format,
        },
        [{ key: citekey.replace(/^@/, ''), library: 1 }],
        { file }
      );
    } catch (e) {
      console.error(e);
      new Notice(
        'Sync failed — is Zotero running? Check the developer console for details.',
        7000
      );
    } finally {
      this.syncing.delete(file.path);
    }
  }

  async openNotes(createdOrUpdatedMarkdownFilesPaths: string[]) {
    const pathOfNotesToOpen: string[] = [];
    if (this.settings.openNoteAfterImport) {
      // Depending on the choice, retreive the paths of the first, the last or all imported notes
      switch (this.settings.whichNotesToOpenAfterImport) {
        case 'first-imported-note': {
          pathOfNotesToOpen.push(createdOrUpdatedMarkdownFilesPaths[0]);
          break;
        }
        case 'last-imported-note': {
          pathOfNotesToOpen.push(
            createdOrUpdatedMarkdownFilesPaths[
              createdOrUpdatedMarkdownFilesPaths.length - 1
            ]
          );
          break;
        }
        case 'all-imported-notes': {
          pathOfNotesToOpen.push(...createdOrUpdatedMarkdownFilesPaths);
          break;
        }
      }
    }

    // Force a 1s delay after importing the files to make sure that notes are created before attempting to open them.
    // A better solution could surely be found to refresh the vault, but I am not sure how to proceed!
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const leaves = this.app.workspace.getLeavesOfType('markdown');
    for (const path of pathOfNotesToOpen) {
      const note = this.app.vault.getAbstractFileByPath(path);
      const open = leaves.find(
        (leaf) => (leaf.view as EditableFileView).file === note
      );
      if (open) {
        app.workspace.revealLeaf(open);
      } else if (note instanceof TFile) {
        await this.app.workspace.getLeaf(true).openFile(note);
      }
    }
  }

  // Students upgrading from the separate Zotero Integration plugin already
  // configured an import format there; copy it over so the upgrade needs no
  // re-setup. Runs once, and never over formats set up in Second Reader.
  async importLegacyZoteroSettings() {
    if (this.settings._importedLegacyZoteroSettings) return;

    let importedFrom: string | null = null;
    const alreadyConfigured =
      this.settings.exportFormats.length || this.settings.citeFormats.length;

    if (!alreadyConfigured) {
      for (const id of LEGACY_ZOTERO_PLUGIN_IDS) {
        const dataPath = normalizePath(
          `${this.app.vault.configDir}/plugins/${id}/data.json`
        );
        try {
          if (!(await this.app.vault.adapter.exists(dataPath))) continue;
          const legacy = JSON.parse(await this.app.vault.adapter.read(dataPath));
          // The PDF helper binary lives in the old plugin's folder, so leave
          // its version markers behind and let it download fresh here.
          // Promote settings are Second Reader's own and must not be replaced.
          const {
            exeVersion,
            _exeInternalVersion,
            newNoteFolder,
            templatePath,
            ...zoteroSettings
          } = legacy;
          this.settings = { ...this.settings, ...zoteroSettings };
          importedFrom = id;
          break;
        } catch (e) {
          console.error(`Second Reader: couldn't read ${dataPath}`, e);
        }
      }
    }

    this.settings._importedLegacyZoteroSettings = true;
    await this.saveData(this.settings);

    if (importedFrom) {
      new Notice(
        'Second Reader copied your import format and other Zotero settings from the Zotero Integration plugin.',
        10000
      );
    }
  }

  warnAboutLegacyPlugins() {
    const enabled: Set<string> | undefined = (this.app as any).plugins
      ?.enabledPlugins;
    if (!enabled) return;
    if (LEGACY_ZOTERO_PLUGIN_IDS.some((id) => enabled.has(id))) {
      new Notice(
        'Second Reader now includes Zotero import. Please turn off the separate ' +
          '"Zotero Integration" plugin (Settings → Community plugins) so you ' +
          "don't get duplicate commands.",
        0
      );
    }
  }

  async loadSettings() {
    const loadedSettings = await this.loadData();

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loadedSettings,
    };
  }

  async saveSettings() {
    this.emitter.trigger('settingsUpdated');
    await this.saveData(this.settings);
  }

  deactivateDataExplorer() {
    this.app.workspace.detachLeavesOfType(viewType);
  }

  async activateDataExplorer() {
    this.deactivateDataExplorer();
    const leaf = this.app.workspace.createLeafBySplit(
      this.app.workspace.activeLeaf,
      'vertical'
    );

    await leaf.setViewState({
      type: viewType,
    });
  }

  async updatePDFUtility() {
    const { exeOverridePath, _exeInternalVersion, exeVersion } = this.settings;
    if (exeOverridePath || !exeVersion) return;

    if (
      exeVersion !== currentVersion ||
      !_exeInternalVersion ||
      _exeInternalVersion !== internalVersion
    ) {
      const modal = new LoadingModal(
        app,
        'Updating Second Reader PDF utility...'
      );
      modal.open();

      try {
        const success = await downloadAndExtract();

        if (success) {
          this.settings.exeVersion = currentVersion;
          this.settings._exeInternalVersion = internalVersion;
          this.saveSettings();
        }
      } catch {
        //
      }

      modal.close();
    }
  }
}
