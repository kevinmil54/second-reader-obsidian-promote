/*
 * Second Reader: New project
 *
 * The command "New project (folder, project note and letter)" asks for a
 * title, then makes <projects folder>/<title>/ holding the project note and
 * the project letter, each filled from its template. See newProjectCore.ts
 * for how the templates are filled.
 *
 * Like promote.ts, this only touches files through the Obsidian Vault API, so
 * it behaves the same on macOS and Windows.
 */

import { App, Modal, Notice, Plugin, Setting, TFile, TFolder, normalizePath } from 'obsidian';

import { errorMessage } from './errors';
import {
  DEFAULT_OUTPUT_TYPE,
  DEFAULT_PROJECT_SETTINGS,
  LETTER_FALLBACK,
  OUTPUT_TYPES,
  ProjectFill,
  ProjectSettings,
  fillProjectTemplate,
  localDate,
  projectName,
  projectNoteSource,
} from './newProjectCore';
import { ensureFolder } from './promote';

// The template's text filled in, or the built-in text when the template is
// not set, is missing, or holds Templater code that can't be filled here.
async function renderFromTemplate(
  app: App,
  templatePath: string,
  fallback: string,
  fill: ProjectFill,
  what: string
): Promise<string> {
  const builtIn = fillProjectTemplate(fallback, fill) as string;
  const path = templatePath ? normalizePath(templatePath) : '';
  if (!path) return builtIn;
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    console.warn(`Second Reader: ${what} template not found at "${path}", using the built-in one.`);
    return builtIn;
  }
  const filled = fillProjectTemplate(await app.vault.read(file), fill);
  if (filled === null) {
    new Notice(
      `Second Reader: ${path} has Templater code that Second Reader can't fill in, so the built-in ${what} was used.`
    );
    return builtIn;
  }
  return filled;
}

// Makes the folder, the project note and the letter. Returns the project note,
// or null when nothing was made.
export async function createProject(
  app: App,
  settings: ProjectSettings,
  title: string,
  outputType: string
): Promise<TFile | null> {
  const name = projectName(title);
  if (!name) {
    new Notice('Second Reader: that title has no characters a folder name can use.');
    return null;
  }

  const root = normalizePath(settings.projectsFolder || DEFAULT_PROJECT_SETTINGS.projectsFolder);
  const folder = normalizePath(`${root}/${name}`);
  const letterName = `${name} - letter`;

  // Obsidian compares paths ignoring nothing, but macOS and Windows disks
  // ignore case, so "engelbart" and "Engelbart" would be the same folder.
  const parent = app.vault.getAbstractFileByPath(root);
  const taken =
    parent instanceof TFolder &&
    parent.children.some((c) => c.name.toLowerCase() === name.toLowerCase());
  if (taken) {
    new Notice(`Second Reader: a project called "${name}" already exists in ${root}.`);
    return null;
  }

  const fill = { name, outputType, date: localDate() };
  const source = projectNoteSource(outputType, settings);
  const noteText = await renderFromTemplate(
    app,
    source.templatePath,
    source.fallback,
    { ...fill, letter: letterName },
    'project note'
  );
  const letterText = await renderFromTemplate(
    app,
    settings.projectLetterTemplatePath,
    LETTER_FALLBACK,
    fill,
    'letter'
  );

  await ensureFolder(app.vault, folder);
  const note = await app.vault.create(`${folder}/${name}.md`, noteText);
  await app.vault.create(`${folder}/${letterName}.md`, letterText);
  return note;
}

class NewProjectModal extends Modal {
  private title = '';
  private outputType = DEFAULT_OUTPUT_TYPE;

  constructor(app: App, private onSubmit: (title: string, outputType: string) => void) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'New project' });

    new Setting(contentEl).setName('Title').addText((t) => {
      t.setPlaceholder('Project title').onChange((v) => (this.title = v));
      t.inputEl.addEventListener('keydown', (e) => {
        // Enter that ends text being composed (Chinese, Japanese) is not "go".
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault();
          this.submit();
        }
      });
      window.setTimeout(() => t.inputEl.focus(), 0);
    });

    new Setting(contentEl).setName('Output type').addDropdown((d) => {
      OUTPUT_TYPES.forEach((o) => d.addOption(o, o));
      d.setValue(this.outputType).onChange((v) => (this.outputType = v));
    });

    new Setting(contentEl).addButton((b) =>
      b.setButtonText('Create').setCta().onClick(() => this.submit())
    );
  }

  private submit() {
    if (!this.title.trim()) return;
    this.close();
    this.onSubmit(this.title, this.outputType);
  }

  onClose() {
    this.contentEl.empty();
  }
}

export function registerNewProject(plugin: Plugin, settings: () => ProjectSettings) {
  plugin.addCommand({
    id: 'new-project',
    name: 'New project (folder, project note and letter)',
    callback: () => {
      new NewProjectModal(plugin.app, (title, outputType) => {
        createProject(plugin.app, settings(), title, outputType)
          .then((note) => {
            if (note) void plugin.app.workspace.getLeaf(false).openFile(note);
          })
          .catch((e) => {
            console.error('Second Reader new project:', e);
            new Notice(`Second Reader: couldn't make the project — ${errorMessage(e)}`);
          });
      }).open();
    },
  });
}
