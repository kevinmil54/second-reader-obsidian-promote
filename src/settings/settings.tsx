import {
  App,
  Notice,
  PluginSettingTab,
  Setting,
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
import { Icon } from './Icon';
import { SettingItem } from './SettingItem';

interface SettingsComponentProps {
  settings: ZoteroConnectorSettings;
  addCiteFormat: (format: CitationFormat) => CitationFormat[];
  updateCiteFormat: (index: number, format: CitationFormat) => CitationFormat[];
  removeCiteFormat: (index: number) => CitationFormat[];
  addExportFormat: (format: ExportFormat) => ExportFormat[];
  updateExportFormat: (index: number, format: ExportFormat) => ExportFormat[];
  removeExportFormat: (index: number) => ExportFormat[];
  updateSetting: (
    key: keyof ZoteroConnectorSettings,
    value: ZoteroConnectorSettings[keyof ZoteroConnectorSettings]
  ) => void;
}

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

function SettingsComponent({
  settings,
  addCiteFormat,
  updateCiteFormat,
  removeCiteFormat,
  addExportFormat,
  updateExportFormat,
  removeExportFormat,
  updateSetting,
}: SettingsComponentProps) {
  const [openNoteAfterImportState, setOpenNoteAfterImport] = React.useState(
    !!settings.openNoteAfterImport
  );

  const [ocrState, setOCRState] = React.useState(settings.pdfExportImageOCR);

  const [concat, setConcat] = React.useState(!!settings.shouldConcat);

  const tessPathRef = React.useRef<HTMLInputElement>(null);
  const tessDataPathRef = React.useRef<HTMLInputElement>(null);

  const [useCustomPort, setUseCustomPort] = React.useState(
    settings.database === 'Custom'
  );

  return (
    <div>
      <SettingItem name="General Settings" isHeading />
      <AssetDownloader settings={settings} updateSetting={updateSetting} />
      <SettingItem
        name="Database"
        description="Supports Zotero and Juris-M. Alternatively a custom port number can be specified."
      >
        <select
          className="dropdown"
          defaultValue={settings.database}
          onChange={(e) => {
            const value = (e.target as HTMLSelectElement).value;
            updateSetting('database', value);
            if (value === 'Custom') {
              setUseCustomPort(true);
            } else {
              setUseCustomPort(false);
            }
          }}
        >
          <option value="Zotero">Zotero</option>
          <option value="Juris-M">Juris-M</option>
          <option value="Custom">Custom</option>
        </select>
      </SettingItem>
      {useCustomPort ? (
        <SettingItem
          name="Port number"
          description="If a custom port number has been set in Zotero, enter it here."
        >
          <input
            onChange={(e) =>
              updateSetting('port', (e.target as HTMLInputElement).value)
            }
            type="number"
            placeholder="Example: 23119"
            defaultValue={settings.port}
          />
        </SettingItem>
      ) : null}
      <SettingItem
        name="Note Import Location"
        description="Notes imported from Zotero will be added to this folder in your vault"
      >
        <input
          onChange={(e) =>
            updateSetting(
              'noteImportFolder',
              (e.target as HTMLInputElement).value
            )
          }
          type="text"
          spellCheck={false}
          placeholder="Example: folder 1/folder 2"
          defaultValue={settings.noteImportFolder}
        />
      </SettingItem>
      <SettingItem
        name="Open the created or updated note(s) after import"
        description="The created or updated markdown files resulting from the import will be automatically opened."
      >
        <div
          onClick={() => {
            setOpenNoteAfterImport((state) => {
              updateSetting('openNoteAfterImport', !state);
              return !state;
            });
          }}
          className={`checkbox-container${
            openNoteAfterImportState ? ' is-enabled' : ''
          }`}
        />
      </SettingItem>
      <SettingItem
        name="Which notes to open after import"
        description="Open either the first note imported, the last note imported, or all notes in new tabs."
      >
        <select
          className="dropdown"
          defaultValue={settings.whichNotesToOpenAfterImport}
          disabled={!settings.openNoteAfterImport}
          onChange={(e) =>
            updateSetting(
              'whichNotesToOpenAfterImport',
              (e.target as HTMLSelectElement).value
            )
          }
        >
          <option value="first-imported-note">First imported note</option>
          <option value="last-imported-note">Last imported note</option>
          <option value="all-imported-notes">All imported notes</option>
        </select>
      </SettingItem>
      <SettingItem
        name="Enable Annotation Concatenation"
        description="Annotations extracted from PDFs that begin with '+' will be appended to the previous annotation. Note: Annotation ordering is not always consistent and you may not always acheive the desire concatenation result"
      >
        <div
          onClick={() => {
            setConcat((state) => {
              updateSetting('shouldConcat', !state);
              return !state;
            });
          }}
          className={`checkbox-container${concat ? ' is-enabled' : ''}`}
        />
      </SettingItem>
      <CiteFormatsSection
        settings={settings}
        addCiteFormat={addCiteFormat}
        updateCiteFormat={updateCiteFormat}
        removeCiteFormat={removeCiteFormat}
      />
      <ExportFormatsSection
        settings={settings}
        addExportFormat={addExportFormat}
        updateExportFormat={updateExportFormat}
        removeExportFormat={removeExportFormat}
      />

      <SettingItem
        name="Import Image Settings"
        description="Rectangle annotations will be extracted from PDFs as images."
        isHeading
      />
      <SettingItem name="Image Format">
        <select
          className="dropdown"
          defaultValue={settings.pdfExportImageFormat}
          onChange={(e) =>
            updateSetting(
              'pdfExportImageFormat',
              (e.target as HTMLSelectElement).value
            )
          }
        >
          <option value="jpg">jpg</option>
          <option value="png">png</option>
        </select>
      </SettingItem>
      <SettingItem name="Image Quality (jpg only)">
        <input
          min="0"
          max="100"
          onChange={(e) =>
            updateSetting(
              'pdfExportImageQuality',
              Number((e.target as HTMLInputElement).value)
            )
          }
          type="number"
          defaultValue={settings.pdfExportImageQuality.toString()}
        />
      </SettingItem>
      <SettingItem name="Image DPI">
        <input
          min="0"
          onChange={(e) =>
            updateSetting(
              'pdfExportImageDPI',
              Number((e.target as HTMLInputElement).value)
            )
          }
          type="number"
          defaultValue={settings.pdfExportImageDPI.toString()}
        />
      </SettingItem>
      <SettingItem
        name="Image OCR"
        description={
          <div>
            Attempt to extract text from images created by rectangle
            annotations. This requires that{' '}
            <a
              href="https://tesseract-ocr.github.io/tessdoc/"
              target="_blank"
              rel="noreferrer"
            >
              tesseract
            </a>{' '}
            be installed on your system. Tesseract can be installed from
            <a href="https://brew.sh/" target="_blank" rel="noreferrer">
              homebrew on mac
            </a>
            , various linux package managers, and from{' '}
            <a
              href="https://github.com/UB-Mannheim/tesseract/wiki"
              target="_blank"
              rel="noreferrer"
            >
              here on windows
            </a>
            .
          </div>
        }
      >
        <div
          onClick={() =>
            setOCRState((s) => {
              updateSetting('pdfExportImageOCR', !s);
              return !s;
            })
          }
          className={`checkbox-container${ocrState ? ' is-enabled' : ''}`}
        />
      </SettingItem>
      <SettingItem
        name="Tesseract path"
        description={
          <div>
            Required: An absolute path to the tesseract executable. This can be
            found on mac and linux with the terminal command{' '}
            <pre>which tesseract</pre>
          </div>
        }
      >
        <input
          ref={tessPathRef}
          onChange={(e) =>
            updateSetting(
              'pdfExportImageTesseractPath',
              (e.target as HTMLInputElement).value
            )
          }
          type="text"
          defaultValue={settings.pdfExportImageTesseractPath}
        />
        <div
          className="clickable-icon setting-editor-extra-setting-button"
          aria-label="Attempt to find tesseract automatically"
          onClick={async () => {
            try {
              const pathToTesseract = await which('tesseract');
              if (pathToTesseract) {
                tessPathRef.current.value = pathToTesseract;
                updateSetting('pdfExportImageTesseractPath', pathToTesseract);
              } else {
                new Notice(
                  'Unable to find tesseract on your system. If it is installed, please manually enter a path.'
                );
              }
            } catch (e) {
              new Notice(
                'Unable to find tesseract on your system. If it is installed, please manually enter a path.'
              );
              console.error(e);
            }
          }}
        >
          <Icon name="magnifying-glass" />
        </div>
      </SettingItem>
      <SettingItem
        name="Image OCR Language"
        description={
          <div>
            Optional: defaults to english. Multiple languages can be specified
            like so: <pre>eng+deu</pre>. Each language must be installed on your
            system.{' '}
            <a
              href="https://github.com/tesseract-ocr/tessdata"
              target="_blank"
              rel="noreferrer"
            >
              Languages can be downloaded here
            </a>
            . (See{' '}
            <a
              href="https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html"
              target="_blank"
              rel="noreferrer"
            >
              here for a description of the language codes
            </a>
            )
          </div>
        }
      >
        <input
          onChange={(e) =>
            updateSetting(
              'pdfExportImageOCRLang',
              (e.target as HTMLInputElement).value
            )
          }
          type="text"
          defaultValue={settings.pdfExportImageOCRLang}
        />
      </SettingItem>
      <SettingItem
        name="Tesseract data directory"
        description="Optional: supply an absolute path to the directory where tesseract's language files reside. This folder should include *.traineddata files for your selected languages."
      >
        <input
          ref={tessDataPathRef}
          onChange={(e) =>
            updateSetting(
              'pdfExportImageTessDataDir',
              (e.target as HTMLInputElement).value
            )
          }
          type="text"
          defaultValue={settings.pdfExportImageTessDataDir}
        />
        <div
          className="clickable-icon setting-editor-extra-setting-button"
          aria-label="Select the tesseract data directory"
          onClick={() => {
            const path = getElectron().remote.dialog.showOpenDialogSync({
              properties: ['openDirectory'],
            });

            if (path && path.length) {
              tessDataPathRef.current.value = path[0];
              updateSetting('pdfExportImageTessDataDir', path[0]);
            }
          }}
        >
          <Icon name="lucide-folder-open" />
        </div>
      </SettingItem>
    </div>
  );
}

// A settings sub-page that hosts one of the React editors. The class is built
// when a page is opened rather than at load, because SettingPage only exists
// in Obsidian 1.13 and later and this plugin still loads on older versions
// (which use display() instead).
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

  reactRoot: HTMLElement | null = null;

  // Obsidian 1.13 and later build the settings screen from these definitions,
  // which also makes every setting findable from the settings search. Older
  // versions never call this and use display() below.
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

  display() {
    const { containerEl } = this;
    if (this.reactRoot) ReactDOM.unmountComponentAtNode(this.reactRoot);
    containerEl.empty();

    this.displayPromoteSettings(containerEl.createDiv());
    this.displaySynthesisSettings(containerEl.createDiv());
    this.displayPackageSettings(containerEl.createDiv());

    new Setting(containerEl)
      .setName('Zotero import & highlight sync')
      .setHeading();
    this.reactRoot = containerEl.createDiv();
    ReactDOM.render(
      <SettingsComponent
        settings={this.plugin.settings}
        addCiteFormat={this.addCiteFormat}
        updateCiteFormat={this.updateCiteFormat}
        removeCiteFormat={this.removeCiteFormat}
        addExportFormat={this.addExportFormat}
        updateExportFormat={this.updateExportFormat}
        removeExportFormat={this.removeExportFormat}
        updateSetting={this.updateSetting}
      />,
      this.reactRoot
    );
  }

  displayPackageSettings(el: HTMLElement) {
    new Setting(el).setName('Packaging notes for upload').setHeading();
    new Setting(el)
      .setName('Your name')
      .setDesc(
        'Used in the name of the zip that "Package my Week N literature notes" makes, ' +
          'so your instructor can tell whose notes are whose.'
      )
      .addText((text) =>
        text
          .setPlaceholder('First Last')
          .setValue(this.plugin.settings.studentName ?? '')
          .onChange((value) => {
            this.plugin.settings.studentName = value.trim();
            this.debouncedSave();
          })
      );
  }

  displayPromoteSettings(el: HTMLElement) {
    new Setting(el).setName('Promote candidates').setHeading();
    el.createEl('p', {
      text:
        'Checking a box under “## Permanent note candidates” in a note tagged ' +
        'literature-note creates a new permanent note and turns that line into a link.',
    });

    new Setting(el)
      .setName('New note folder')
      .setDesc(
        'Where promoted permanent notes are created. Leave blank to use the same ' +
          'folder as the literature note instead of a dedicated folder.'
      )
      .addText((text) =>
        text
          .setPlaceholder('Permanent notes')
          .setValue(this.plugin.settings.newNoteFolder)
          .onChange((value) => {
            this.plugin.settings.newNoteFolder = value.trim();
            this.debouncedSave();
          })
      );

    new Setting(el)
      .setName('Template path')
      .setDesc(
        'Vault path to the template used for promoted notes. Supports {{title}}, ' +
          '{{date}}, {{source}}, {{tags}}, {{topics}}, and {{details}} placeholders — ' +
          '{{tags}} is "permanent-note" plus the literature note\'s own tags (its ' +
          'literature-note/status tags are dropped, not carried over); {{topics}} is ' +
          "the literature note's topics: list; {{details}} is " +
          "whatever's typed on indented lines under a candidate (Enter, then Tab, " +
          'right after its title). Leave blank to use a minimal built-in template.'
      )
      .addText((text) =>
        text
          .setPlaceholder('Templates/Permanent Note Template.md')
          .setValue(this.plugin.settings.templatePath)
          .onChange((value) => {
            this.plugin.settings.templatePath = value.trim();
            this.debouncedSave();
          })
      );
  }

  displaySynthesisSettings(el: HTMLElement) {
    new Setting(el).setName('Synthesis notes').setHeading();
    el.createEl('p', {
      text:
        'When enough permanent notes share a topic (their topics: property), a synthesis ' +
        'note is created for it, and its list of permanent notes is kept up to date. ' +
        'Only that list is changed; the rest of the note is yours.',
    });

    new Setting(el)
      .setName('Create synthesis notes automatically')
      .setDesc(
        'Make a synthesis note when a permanent note you add or edit brings its topic to the ' +
          'minimum below. Turn this off to create them only with the command "Create synthesis ' +
          'notes for topics with enough permanent notes".'
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.synthesisAutoCreate)
          .onChange((value) => {
            this.plugin.settings.synthesisAutoCreate = value;
            this.debouncedSave();
          })
      );

    new Setting(el)
      .setName('Minimum permanent notes')
      .setDesc(
        'How many permanent notes a topic needs before it gets a synthesis note.'
      )
      .addText((text) =>
        text
          .setPlaceholder('4')
          .setValue(String(this.plugin.settings.synthesisMinNotes))
          .onChange((value) => {
            const n = parseInt(value.trim(), 10);
            if (n >= 1) {
              this.plugin.settings.synthesisMinNotes = n;
              this.debouncedSave();
            }
          })
      );

    new Setting(el)
      .setName('Synthesis note folder')
      .setDesc('Where new synthesis notes are created.')
      .addText((text) =>
        text
          .setPlaceholder('Synthesis notes')
          .setValue(this.plugin.settings.synthesisFolder)
          .onChange((value) => {
            this.plugin.settings.synthesisFolder = value.trim();
            this.debouncedSave();
          })
      );

    new Setting(el)
      .setName('Synthesis template path')
      .setDesc(
        'Vault path to the template for new synthesis notes. {{title}}, {{date}} and {{topic}} ' +
          'are filled in, and so are the Templater title, date and topic prompt in the ' +
          'instructor template. A template with anything else in it falls back to a built-in ' +
          'note. Leave blank to use the built-in note.'
      )
      .addText((text) =>
        text
          .setPlaceholder('Templates/Synthesis Note Template.md')
          .setValue(this.plugin.settings.synthesisTemplatePath)
          .onChange((value) => {
            this.plugin.settings.synthesisTemplatePath = value.trim();
            this.debouncedSave();
          })
      );
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
      this.plugin.saveSettings();
    }, 150);
  }

  hide() {
    super.hide();
    if (this.reactRoot) ReactDOM.unmountComponentAtNode(this.reactRoot);
    this.reactRoot = null;
  }
}
