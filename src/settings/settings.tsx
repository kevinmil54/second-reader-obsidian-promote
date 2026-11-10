import {
  App,
  Notice,
  PluginSettingTab,
  SettingDefinitionItem,
  SettingPage,
  TextComponent,
  debounce,
} from 'obsidian';
import { VNode } from 'preact';
import React from 'react';
import ReactDOM from 'react-dom';
import which from 'which';

import { DEFAULT_CSL_STYLE } from '../defaultFormats';
import { getElectron } from '../helpers';
import ZoteroConnector from '../main';
import {
  CitationFormat,
  ExportFormat,
  ZoteroConnectorSettings,
} from '../types';
import { AssetDownloader } from './AssetDownloader';
import { CiteFormatSettings } from './CiteFormatSettings';
import { ExportFormatSettings } from './ExportFormatSettings';
import { SettingItem } from './SettingItem';

interface CiteFormatsSectionProps {
  settings: ZoteroConnectorSettings;
  addCiteFormat: (format: CitationFormat) => CitationFormat[];
  updateCiteFormat: (index: number, format: CitationFormat) => CitationFormat[];
  removeCiteFormat: (index: number) => CitationFormat[];
  showHeading?: boolean;
}

export function CiteFormatsSection({
  settings,
  addCiteFormat,
  updateCiteFormat,
  removeCiteFormat,
  showHeading = true,
}: CiteFormatsSectionProps) {
  const [citeFormatState, setCiteFormatState] = React.useState(
    settings.citeFormats
  );
  const updateCite = React.useCallback(
    debounce(
      (index: number, format: CitationFormat) => {
        setCiteFormatState(updateCiteFormat(index, format));
      },
      200,
      true
    ),
    [updateCiteFormat]
  );

  const addCite = React.useCallback(() => {
    setCiteFormatState(
      addCiteFormat({
        name: `Format #${citeFormatState.length + 1}`,
        format: 'formatted-citation',
        cslStyle: DEFAULT_CSL_STYLE,
      })
    );
  }, [addCiteFormat, citeFormatState]);

  const removeCite = React.useCallback(
    (index: number) => {
      setCiteFormatState(removeCiteFormat(index));
    },
    [removeCiteFormat]
  );

  return (
    <div>
      {showHeading ? <SettingItem name="Citation Formats" isHeading /> : null}
      <SettingItem>
        <button onClick={addCite} className="mod-cta">
          Add Citation Format
        </button>
      </SettingItem>
      {citeFormatState.map((f, i) => {
        return (
          <CiteFormatSettings
            key={i}
            format={f}
            index={i}
            updateFormat={updateCite}
            removeFormat={removeCite}
          />
        );
      })}
    </div>
  );
}

interface ExportFormatsSectionProps {
  settings: ZoteroConnectorSettings;
  addExportFormat: (format: ExportFormat) => ExportFormat[];
  updateExportFormat: (index: number, format: ExportFormat) => ExportFormat[];
  removeExportFormat: (index: number) => ExportFormat[];
  showHeading?: boolean;
}

export function ExportFormatsSection({
  settings,
  addExportFormat,
  updateExportFormat,
  removeExportFormat,
  showHeading = true,
}: ExportFormatsSectionProps) {
  const [exportFormatState, setExportFormatState] = React.useState(
    settings.exportFormats
  );

  const updateExport = React.useCallback(
    debounce(
      (index: number, format: ExportFormat) => {
        setExportFormatState(updateExportFormat(index, format));
      },
      200,
      true
    ),
    [updateExportFormat]
  );

  const addExport = React.useCallback(() => {
    setExportFormatState(
      addExportFormat({
        name: `Import #${exportFormatState.length + 1}`,
        outputPathTemplate: '{{citekey}}.md',
        imageOutputPathTemplate: '{{citekey}}/',
        imageBaseNameTemplate: 'image',
        cslStyle: DEFAULT_CSL_STYLE,
      })
    );
  }, [addExportFormat, exportFormatState]);

  const removeExport = React.useCallback(
    (index: number) => {
      setExportFormatState(removeExportFormat(index));
    },
    [removeExportFormat]
  );

  return (
    <div>
      {showHeading ? <SettingItem name="Import Formats" isHeading /> : null}
      <SettingItem>
        <button onClick={addExport} className="mod-cta">
          Add Import Format
        </button>
      </SettingItem>
      {exportFormatState.map((f, i) => {
        return (
          <ExportFormatSettings
            key={exportFormatState.length - i}
            format={f}
            index={i}
            updateFormat={updateExport}
            removeFormat={removeExport}
          />
        );
      })}
    </div>
  );
}

// A settings sub-page that hosts one of the React editors.
function createReactPage(title: string, render: () => VNode): SettingPage {
  class ReactSettingPage extends SettingPage {
    constructor() {
      super();
      this.title = title;
    }

    display() {
      this.containerEl.empty();
      ReactDOM.render(render(), this.containerEl);
    }

    hide() {
      ReactDOM.unmountComponentAtNode(this.containerEl);
      super.hide();
    }
  }

  return new ReactSettingPage();
}

export class ZoteroConnectorSettingsTab extends PluginSettingTab {
  plugin: ZoteroConnector;
  dbTimer: number;

  constructor(app: App, plugin: ZoteroConnector) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // Obsidian builds the settings screen from these definitions, which also
  // makes every setting findable from the settings search.
  getSettingDefinitions(): SettingDefinitionItem[] {
    const settings = this.plugin.settings;

    return [
      {
        type: 'group',
        heading: 'Promote candidates',
        items: [
          {
            name: 'New note folder',
            desc:
              'Where promoted permanent notes are created. Leave blank to use the same ' +
              'folder as the literature note instead of a dedicated folder. Checking a box ' +
              'under “## Permanent note candidates” in a note tagged literature-note ' +
              'creates a new permanent note and turns that line into a link.',
            control: {
              type: 'text',
              key: 'newNoteFolder',
              placeholder: 'Permanent notes',
            },
          },
          {
            name: 'Template path',
            desc:
              'Vault path to the template used for promoted notes. Supports {{title}}, ' +
              '{{date}}, {{source}}, {{tags}}, {{topics}}, and {{details}} placeholders — ' +
              '{{tags}} is "permanent-note" plus the literature note\'s own tags (its ' +
              'literature-note/status tags are dropped, not carried over); {{topics}} is ' +
              "the literature note's topics: list; {{details}} is " +
              "whatever's typed on indented lines under a candidate (Enter, then Tab, " +
              'right after its title). Leave blank to use a minimal built-in template.',
            control: {
              type: 'text',
              key: 'templatePath',
              placeholder: 'Templates/Permanent Note Template.md',
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Synthesis notes',
        items: [
          {
            name: 'Create synthesis notes automatically',
            desc:
              'When enough permanent notes share a topic (their topics: property), a ' +
              'synthesis note is created for it, and its list of permanent notes is kept ' +
              'up to date. Only that list is changed; the rest of the note is yours. ' +
              'Make a synthesis note when a permanent note you add or edit brings its ' +
              'topic to the minimum below. Turn this off to create them only with the ' +
              'command "Create synthesis notes for topics with enough permanent notes".',
            control: { type: 'toggle', key: 'synthesisAutoCreate' },
          },
          {
            name: 'Minimum permanent notes',
            desc: 'How many permanent notes a topic needs before it gets a synthesis note.',
            control: {
              type: 'number',
              key: 'synthesisMinNotes',
              placeholder: '4',
              min: 1,
              step: 1,
              validate: (value: number) =>
                value >= 1 ? undefined : 'Enter a whole number of 1 or more.',
            },
          },
          {
            name: 'Synthesis note folder',
            desc: 'Where new synthesis notes are created.',
            control: {
              type: 'text',
              key: 'synthesisFolder',
              placeholder: 'Synthesis notes',
            },
          },
          {
            name: 'Synthesis template path',
            desc:
              'Vault path to the template for new synthesis notes. {{title}}, {{date}} and {{topic}} ' +
              'are filled in, and so are the Templater title, date and topic prompt in the ' +
              'instructor template. A template with anything else in it falls back to a built-in ' +
              'note. Leave blank to use the built-in note.',
            control: {
              type: 'text',
              key: 'synthesisTemplatePath',
              placeholder: 'Templates/Synthesis Note Template.md',
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Packaging notes for upload',
        items: [
          {
            name: 'Your name',
            desc:
              'Used in the name of the zip that "Package my Week N literature notes" makes, ' +
              'so your instructor can tell whose notes are whose.',
            control: {
              type: 'text',
              key: 'studentName',
              placeholder: 'First Last',
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Zotero import & highlight sync',
        items: [
          {
            type: 'page',
            name: 'PDF utility',
            desc: 'Download, update, or point to your own copy of the program that reads highlights out of PDF files.',
            page: () =>
              createReactPage('PDF utility', () => (
                <AssetDownloader
                  settings={this.plugin.settings}
                  updateSetting={this.updateSetting}
                />
              )),
          },
          {
            name: 'Database',
            desc: 'Supports Zotero and Juris-M. Alternatively a custom port number can be specified.',
            control: {
              type: 'dropdown',
              key: 'database',
              options: {
                Zotero: 'Zotero',
                'Juris-M': 'Juris-M',
                Custom: 'Custom',
              },
            },
          },
          {
            name: 'Port number',
            desc: 'If a custom port number has been set in Zotero, enter it here.',
            visible: () => settings.database === 'Custom',
            control: {
              type: 'text',
              key: 'port',
              placeholder: 'Example: 23119',
            },
          },
          {
            name: 'Note import location',
            desc: 'Notes imported from Zotero will be added to this folder in your vault',
            control: {
              type: 'text',
              key: 'noteImportFolder',
              placeholder: 'Example: folder 1/folder 2',
            },
          },
          {
            name: 'Open the created or updated note(s) after import',
            desc: 'The created or updated markdown files resulting from the import will be automatically opened.',
            control: { type: 'toggle', key: 'openNoteAfterImport' },
          },
          {
            name: 'Which notes to open after import',
            desc: 'Open either the first note imported, the last note imported, or all notes in new tabs.',
            control: {
              type: 'dropdown',
              key: 'whichNotesToOpenAfterImport',
              disabled: () => !settings.openNoteAfterImport,
              options: {
                'first-imported-note': 'First imported note',
                'last-imported-note': 'Last imported note',
                'all-imported-notes': 'All imported notes',
              },
            },
          },
          {
            name: 'Enable annotation concatenation',
            desc:
              "Annotations extracted from PDFs that begin with '+' will be appended to the previous " +
              'annotation. Note: Annotation ordering is not always consistent and you may not always ' +
              'achieve the desired concatenation result',
            control: { type: 'toggle', key: 'shouldConcat' },
          },
          {
            type: 'page',
            name: 'Citation formats',
            desc: 'The ways a citation from Zotero can be inserted into a note.',
            page: () =>
              createReactPage('Citation formats', () => (
                <CiteFormatsSection
                  settings={this.plugin.settings}
                  addCiteFormat={this.addCiteFormat}
                  updateCiteFormat={this.updateCiteFormat}
                  removeCiteFormat={this.removeCiteFormat}
                  showHeading={false}
                />
              )),
          },
          {
            type: 'page',
            name: 'Import formats',
            desc: 'How papers and highlights from Zotero become notes in your vault.',
            page: () =>
              createReactPage('Import formats', () => (
                <ExportFormatsSection
                  settings={this.plugin.settings}
                  addExportFormat={this.addExportFormat}
                  updateExportFormat={this.updateExportFormat}
                  removeExportFormat={this.removeExportFormat}
                  showHeading={false}
                />
              )),
          },
          {
            type: 'page',
            name: 'Import image settings',
            desc: 'Rectangle annotations will be extracted from PDFs as images.',
            items: this.imageSettingDefinitions(),
          },
        ],
      },
    ];
  }

  private imageSettingDefinitions(): SettingDefinitionItem[] {
    const settings = this.plugin.settings;

    return [
      {
        name: 'Image format',
        control: {
          type: 'dropdown',
          key: 'pdfExportImageFormat',
          options: { jpg: 'jpg', png: 'png' },
        },
      },
      {
        name: 'Image quality (jpg only)',
        control: {
          type: 'number',
          key: 'pdfExportImageQuality',
          min: 0,
          max: 100,
        },
      },
      {
        name: 'Image DPI',
        control: { type: 'number', key: 'pdfExportImageDPI', min: 0 },
      },
      {
        name: 'Image OCR',
        desc: createFragment((f) => {
          f.appendText(
            'Attempt to extract text from images created by rectangle annotations. ' +
              'This requires that '
          );
          f.createEl('a', {
            text: 'tesseract',
            href: 'https://tesseract-ocr.github.io/tessdoc/',
          });
          f.appendText(
            ' be installed on your system. Tesseract can be installed from '
          );
          f.createEl('a', {
            text: 'homebrew on mac',
            href: 'https://brew.sh/',
          });
          f.appendText(', various linux package managers, and from ');
          f.createEl('a', {
            text: 'here on windows',
            href: 'https://github.com/UB-Mannheim/tesseract/wiki',
          });
          f.appendText('.');
        }),
        control: { type: 'toggle', key: 'pdfExportImageOCR' },
      },
      {
        name: 'Tesseract path',
        desc: 'Required: An absolute path to the tesseract executable. This can be found on mac and linux with the terminal command "which tesseract".',
        render: (setting) => {
          let input: TextComponent | null = null;
          setting
            .addText((text) => {
              input = text;
              text
                .setValue(settings.pdfExportImageTesseractPath ?? '')
                .onChange((value) =>
                  this.updateSetting('pdfExportImageTesseractPath', value)
                );
            })
            .addExtraButton((button) =>
              button
                .setIcon('search')
                .setTooltip('Attempt to find tesseract automatically')
                .onClick(async () => {
                  const notFound =
                    'Unable to find tesseract on your system. If it is installed, please manually enter a path.';
                  try {
                    const pathToTesseract = await which('tesseract');
                    if (pathToTesseract) {
                      input?.setValue(pathToTesseract);
                      this.updateSetting(
                        'pdfExportImageTesseractPath',
                        pathToTesseract
                      );
                    } else {
                      new Notice(notFound);
                    }
                  } catch (e) {
                    new Notice(notFound);
                    console.error(e);
                  }
                })
            );
        },
      },
      {
        name: 'Image OCR language',
        desc: createFragment((f) => {
          f.appendText(
            'Optional: defaults to english. Multiple languages can be specified like so: eng+deu. ' +
              'Each language must be installed on your system. '
          );
          f.createEl('a', {
            text: 'Languages can be downloaded here',
            href: 'https://github.com/tesseract-ocr/tessdata',
          });
          f.appendText('. (See ');
          f.createEl('a', {
            text: 'here for a description of the language codes',
            href: 'https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html',
          });
          f.appendText(')');
        }),
        control: { type: 'text', key: 'pdfExportImageOCRLang' },
      },
      {
        name: 'Tesseract data directory',
        desc: "Optional: supply an absolute path to the directory where tesseract's language files reside. This folder should include *.traineddata files for your selected languages.",
        render: (setting) => {
          let input: TextComponent | null = null;
          setting
            .addText((text) => {
              input = text;
              text
                .setValue(settings.pdfExportImageTessDataDir ?? '')
                .onChange((value) =>
                  this.updateSetting('pdfExportImageTessDataDir', value)
                );
            })
            .addExtraButton((button) =>
              button
                .setIcon('folder-open')
                .setTooltip('Select the tesseract data directory')
                .onClick(() => {
                  const chosen = getElectron().remote.dialog.showOpenDialogSync(
                    {
                      properties: ['openDirectory'],
                    }
                  );

                  if (chosen && chosen.length) {
                    input?.setValue(chosen[0]);
                    this.updateSetting('pdfExportImageTessDataDir', chosen[0]);
                  }
                })
            );
        },
      },
    ];
  }

  getControlValue(key: string): unknown {
    return (this.plugin.settings as unknown as Record<string, unknown>)[key];
  }

  setControlValue(key: string, value: unknown) {
    // Folders, paths and the name are stored without stray spaces.
    const trimmed = [
      'newNoteFolder',
      'templatePath',
      'synthesisFolder',
      'synthesisTemplatePath',
      'studentName',
    ].includes(key);
    (this.plugin.settings as unknown as Record<string, unknown>)[key] =
      trimmed && typeof value === 'string' ? value.trim() : value;
    this.debouncedSave();

    // The port field and the "which notes" dropdown depend on these.
    if (key === 'database' || key === 'openNoteAfterImport') {
      this.refreshDomState();
    }
  }

  addCiteFormat = (format: CitationFormat) => {
    this.plugin.addFormatCommand(format);
    this.plugin.settings.citeFormats.unshift(format);
    this.debouncedSave();

    return this.plugin.settings.citeFormats.slice();
  };

  updateCiteFormat = (index: number, format: CitationFormat) => {
    this.plugin.removeFormatCommand(this.plugin.settings.citeFormats[index]);
    this.plugin.addFormatCommand(format);
    this.plugin.settings.citeFormats[index] = format;
    this.debouncedSave();

    return this.plugin.settings.citeFormats.slice();
  };

  removeCiteFormat = (index: number) => {
    this.plugin.removeFormatCommand(this.plugin.settings.citeFormats[index]);
    this.plugin.settings.citeFormats.splice(index, 1);
    this.debouncedSave();

    return this.plugin.settings.citeFormats.slice();
  };

  addExportFormat = (format: ExportFormat) => {
    this.plugin.addExportCommand(format);
    this.plugin.settings.exportFormats.unshift(format);
    this.debouncedSave();

    return this.plugin.settings.exportFormats.slice();
  };

  updateExportFormat = (index: number, format: ExportFormat) => {
    this.plugin.removeExportCommand(this.plugin.settings.exportFormats[index]);
    this.plugin.addExportCommand(format);
    this.plugin.settings.exportFormats[index] = format;
    this.debouncedSave();

    return this.plugin.settings.exportFormats.slice();
  };

  removeExportFormat = (index: number) => {
    this.plugin.removeExportCommand(this.plugin.settings.exportFormats[index]);
    this.plugin.settings.exportFormats.splice(index, 1);
    this.debouncedSave();

    return this.plugin.settings.exportFormats.slice();
  };

  updateSetting = <T extends keyof ZoteroConnectorSettings>(
    key: T,
    value: ZoteroConnectorSettings[T]
  ) => {
    this.plugin.settings[key] = value;
    this.debouncedSave();
  };

  debouncedSave() {
    window.clearTimeout(this.dbTimer);
    this.dbTimer = window.setTimeout(() => {
      void this.plugin.saveSettings();
    }, 150);
  }
}
