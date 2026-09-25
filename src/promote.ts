/*
 * Second Reader: Promote Candidates
 *
 * Watches literature notes (frontmatter tag "literature-note") for checked
 * boxes under "## Permanent note candidates". Checking a box creates a new
 * permanent note and rewrites that line as a link to it.
 *
 * Cross-platform note: this module only ever touches files through the
 * Obsidian Vault API (app.vault.*) and normalizePath() — never Node's raw
 * fs/path modules and no OS branching — so it behaves identically on macOS,
 * Windows, and Linux. Filenames are sanitized against Windows' rules (the
 * stricter of the two platforms), which are a superset of what macOS
 * forbids, so a title that's safe here is safe on both.
 */

import { Notice, Plugin, TAbstractFile, TFile, Vault, normalizePath } from 'obsidian';

const CANDIDATE_HEADING = '## permanent note candidates';
const LIT_NOTE_TAG = 'literature-note';
const PERMANENT_NOTE_TAG = 'permanent-note';
// Status/provenance markers that describe the note's role in the workflow,
// not its topic — these never carry over to a promoted note.
const NON_CARRYING_TAGS = new Set([LIT_NOTE_TAG, PERMANENT_NOTE_TAG, 'sr-candidate']);
const CHECKED_ITEM_RE = /^(\s*-\s*\[[xX]\]\s*)(.*)$/;
const SR_TAG_RE = /#sr-candidate\b/gi;
const HEADING_RE = /^#{1,6}\s/;
const ALREADY_LINK_RE = /^\[\[.*\]\]$/;

// Windows-reserved device names; forbidding them keeps a title safe on
// Windows without affecting how it looks on macOS.
const WINDOWS_RESERVED = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

export interface PromoteSettings {
  newNoteFolder: string; // "" = same folder as the literature note
  templatePath: string; // "" = built-in fallback body
}

export const DEFAULT_PROMOTE_SETTINGS: PromoteSettings = {
  newNoteFolder: 'Permanent notes',
  templatePath: 'Templates/Permanent Note Template.md',
};

export function sanitizeFilename(name: string): string {
  // Characters illegal in a filename on Windows; this set is a strict
  // superset of what macOS forbids, so filtering to it is safe everywhere.
  let out = name.replace(/[\\/:*?"<>|#^[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  // Windows also disallows a trailing dot or space.
  out = out.replace(/[. ]+$/, '');
  if (!out) out = 'Untitled permanent note';
  out = out.slice(0, 120); // stay well under the 255-char path-component limit
  if (WINDOWS_RESERVED.has(out.toUpperCase())) out = out + ' note';
  return out;
}

// Topical tags on the literature note (e.g. course or subject tags a
// student added) carry over to a promoted note; status markers like
// "literature-note" don't — the note is no longer a literature note once
// promoted, it's a permanent note, so that tag is swapped rather than kept.
export function carryOverTags(sourceTags: unknown[]): string[] {
  const seen = new Set<string>();
  const carried: string[] = [];
  for (const t of sourceTags) {
    const tag = String(t).trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (NON_CARRYING_TAGS.has(key) || seen.has(key)) continue;
    seen.add(key);
    carried.push(tag);
  }
  return carried;
}

// Lines more indented than the candidate's own checkbox — typed by pressing
// Enter then Tab right after the candidate title — are elaboration that
// carries over into the promoted note's {{details}}. Re-indented to zero
// (by the smallest indent among them) so nested structure survives but the
// leading whitespace doesn't.
export function collectDetailLines(lines: string[], startIdx: number, parentIndent: number) {
  const detailLines: string[] = [];
  let j = startIdx;
  while (j < lines.length) {
    const childLine = lines[j];
    if (childLine.trim() === '') break;
    const childIndent = (childLine.match(/^(\s*)/) || ['', ''])[1].length;
    if (childIndent <= parentIndent) break;
    detailLines.push(childLine);
    j++;
  }
  const indents = detailLines.map((l) => (l.match(/^(\s*)/) || ['', ''])[1].length);
  const minIndent = indents.length ? Math.min(...indents) : 0;
  const details = detailLines.map((l) => l.slice(minIndent)).join('\n').trim();
  return { details, nextIdx: j };
}

async function ensureFolder(vault: Vault, path: string) {
  if (!path) return;
  const parts = path.split('/').filter(Boolean);
  let cur = '';
  for (const part of parts) {
    cur = cur ? `${cur}/${part}` : part;
    if (!vault.getAbstractFileByPath(cur)) {
      try {
        await vault.createFolder(cur);
      } catch (e) {
        // Race with another process creating it first is fine; anything
        // else will surface when we try to create the note itself.
      }
    }
  }
}

export class Promoter {
  // Guards against re-entrancy: our own vault.modify() call below fires
  // another "modify" event for the same file.
  private processing = new Set<string>();

  constructor(
    private plugin: Plugin,
    private settings: () => PromoteSettings
  ) {}

  register() {
    this.plugin.registerEvent(
      this.plugin.app.vault.on('modify', (file) => {
        this.handleModify(file).catch((e) =>
          console.error('Second Reader promote:', e)
        );
      })
    );
  }

  async handleModify(file: TAbstractFile) {
    if (!(file instanceof TFile) || file.extension !== 'md') return;
    if (this.processing.has(file.path)) return;

    const app = this.plugin.app;
    const cache = app.metadataCache.getFileCache(file);
    const fmTags = cache && cache.frontmatter ? cache.frontmatter.tags : null;
    const tagList: unknown[] = Array.isArray(fmTags) ? fmTags : fmTags ? [fmTags] : [];
    const isLiteratureNote = tagList.some(
      (t) => String(t).toLowerCase() === LIT_NOTE_TAG
    );
    if (!isLiteratureNote) return;

    const content = await app.vault.read(file);
    if (!content.toLowerCase().includes(CANDIDATE_HEADING)) return;

    const lines = content.split('\n');
    let inSection = false;
    let changed = false;

    this.processing.add(file.path);
    try {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (HEADING_RE.test(trimmed)) {
          inSection = trimmed.toLowerCase() === CANDIDATE_HEADING;
          continue;
        }
        if (!inSection) continue;

        const m = line.match(CHECKED_ITEM_RE);
        if (!m) continue;

        const rawText = m[2].trim();
        if (!rawText || ALREADY_LINK_RE.test(rawText)) continue; // nothing to do, or already promoted

        const title = rawText.replace(SR_TAG_RE, '').trim();
        if (!title) continue;

        const itemIndent = (line.match(/^(\s*)/) || ['', ''])[1].length;
        const { details, nextIdx } = collectDetailLines(lines, i + 1, itemIndent);

        try {
          const newFile = await this.createPermanentNote(title, file, tagList, details);
          lines[i] = `${m[1]}[[${newFile.basename}]]`;
          changed = true;
        } catch (e) {
          console.error('Second Reader promote failed:', e);
          new Notice(`Second Reader: couldn't create note "${title}" — ${e.message}`);
        }
        i = nextIdx - 1; // skip the detail lines we already consumed (kept as-is in this note)
      }

      if (changed) {
        await app.vault.modify(file, lines.join('\n'));
      }
    } finally {
      this.processing.delete(file.path);
    }
  }

  async createPermanentNote(
    rawTitle: string,
    sourceFile: TFile,
    sourceTags: unknown[],
    details: string
  ) {
    const vault = this.plugin.app.vault;
    const { newNoteFolder } = this.settings();
    const folder = newNoteFolder
      ? normalizePath(newNoteFolder)
      : sourceFile.parent && sourceFile.parent.path !== '/'
      ? sourceFile.parent.path
      : '';

    if (folder) await ensureFolder(vault, folder);

    const base = sanitizeFilename(rawTitle);
    let path = normalizePath(folder ? `${folder}/${base}.md` : `${base}.md`);
    let n = 2;
    while (vault.getAbstractFileByPath(path)) {
      path = normalizePath(folder ? `${folder}/${base} (${n}).md` : `${base} (${n}).md`);
      n++;
    }

    const body = await this.renderNoteBody(rawTitle, sourceFile, sourceTags || [], details || '');
    return await vault.create(path, body);
  }

  // Fills {{title}}, {{date}}, {{source}}, {{tags}}, {{details}} in the
  // configured template file. Falls back to a minimal built-in body if no
  // template is configured or it can't be found — promotion should never
  // fail just because the template went missing.
  async renderNoteBody(
    rawTitle: string,
    sourceFile: TFile,
    sourceTags: unknown[],
    details: string
  ) {
    const app = this.plugin.app;
    const today = new Date().toISOString().slice(0, 10);
    const escapedTitle = rawTitle.replace(/"/g, '\\"');
    const tagsValue = [PERMANENT_NOTE_TAG, ...carryOverTags(sourceTags)].join(', ');

    const { templatePath: configured } = this.settings();
    const templatePath = configured ? normalizePath(configured) : '';
    const templateFile = templatePath
      ? app.vault.getAbstractFileByPath(templatePath)
      : null;

    if (templateFile instanceof TFile) {
      const raw = await app.vault.read(templateFile);
      return raw
        .replace(/\{\{\s*title\s*\}\}/g, escapedTitle)
        .replace(/\{\{\s*date\s*\}\}/g, today)
        .replace(/\{\{\s*source\s*\}\}/g, sourceFile.basename)
        .replace(/\{\{\s*tags\s*\}\}/g, tagsValue)
        .replace(/\{\{\s*details\s*\}\}/g, details || '');
    }

    if (templatePath) {
      console.warn(
        `Second Reader promote: template not found at "${templatePath}", using built-in fallback.`
      );
    }
    return [
      '---',
      `title: "${escapedTitle}"`,
      'status: permanent',
      `tags: [${tagsValue}]`,
      `created: ${today}`,
      `source: "[[${sourceFile.basename}]]"`,
      '---',
      '',
      `# ${rawTitle}`,
      '',
      ...(details ? [details, ''] : []),
      '## Related notes',
      `- [[${sourceFile.basename}]]`,
      '',
    ].join('\n');
  }
}
