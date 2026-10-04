import { App, Modal, Setting, TFile } from 'obsidian';

import bundledLiteratureTemplate from '../Templates/Literature Note Template - Zotero Import.md';
import { sanitizeObsidianPath } from './bbt/template.helpers';
import {
  backupPathFor,
  hasHighlightImport,
  upgradeTemplateText,
} from './templateUpgrade';
import { ExportFormat } from './types';

export interface TemplateUpgrade {
  file: TFile;
  upgraded: string;
  // Without highlight import a sync adds nothing; other upgrades (the PDF
  // link) are improvements that never need to interrupt a sync.
  missingHighlightImport: boolean;
}

// Import-format templates that are Second Reader literature-note templates
// but older than the one bundled in the plugin.
export async function findOutdatedTemplates(
  app: App,
  formats: ExportFormat[]
): Promise<TemplateUpgrade[]> {
  const seen = new Set<string>();
  const out: TemplateUpgrade[] = [];
  for (const format of formats) {
    if (!format.templatePath) continue;
    const file = app.vault.getAbstractFileByPath(
      sanitizeObsidianPath(format.templatePath)
    );
    if (!(file instanceof TFile) || seen.has(file.path)) continue;
    seen.add(file.path);
    const current = await app.vault.read(file);
    const upgraded = upgradeTemplateText(current, bundledLiteratureTemplate);
    if (upgraded !== null) {
      out.push({
        file,
        upgraded,
        missingHighlightImport: !hasHighlightImport(current),
      });
    }
  }
  return out;
}

// Backs up the current template next to it, then rewrites it. Returns the
// backup's path.
export async function applyTemplateUpgrade(
  app: App,
  { file, upgraded }: TemplateUpgrade
): Promise<string> {
  const current = await app.vault.read(file);
  const backupPath = backupPathFor(
    file.path,
    (p) => !!app.vault.getAbstractFileByPath(p)
  );
  await app.vault.create(backupPath, current);
  await app.vault.modify(file, upgraded);
  return backupPath;
}

class TemplateUpgradeModal extends Modal {
  private decided = false;

  constructor(
    app: App,
    private upgrades: TemplateUpgrade[],
    private reason: string,
    private resolve: (accepted: boolean) => void
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Update your literature-note template?' });
    contentEl.createEl('p', { text: this.reason });
    const list = contentEl.createEl('ul');
    for (const { file } of this.upgrades) {
      list.createEl('li', { text: file.path });
    }
    contentEl.createEl('p', {
      text:
        'Only the parts of the template this needs are changed — anything else ' +
        'you changed in it stays. Your current version is saved as a backup ' +
        'copy next to it first. Notes you have already written are not changed.',
    });

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText('Update template')
          .setCta()
          .onClick(() => this.finish(true))
      )
      .addButton((b) => b.setButtonText('Not now').onClick(() => this.finish(false)));
  }

  private finish(accepted: boolean) {
    this.decided = true;
    this.resolve(accepted);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
    if (!this.decided) this.resolve(false);
  }
}

export function askToUpgradeTemplates(
  app: App,
  upgrades: TemplateUpgrade[],
  reason: string
): Promise<boolean> {
  return new Promise((resolve) => {
    new TemplateUpgradeModal(app, upgrades, reason, resolve).open();
  });
}
