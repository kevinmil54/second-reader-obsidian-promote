/*
 * Second Reader: Promote Candidates
 *
 * Watches literature notes (frontmatter tag "literature-note") for checked
 * boxes under "## Permanent note candidates". Checking a box creates a new
 * permanent note and rewrites that line as a link to it.
 *
 * Cross-platform note: this plugin only ever touches files through the
 * Obsidian Vault API (app.vault.*) and normalizePath() — never Node's raw
 * fs/path modules and no OS branching — so the exact same main.js behaves
 * identically on macOS, Windows, and Linux. Filenames are sanitized against
 * Windows' rules (the stricter of the two platforms), which are a superset
 * of what macOS forbids, so a title that's safe here is safe on both.
 */

const { Plugin, PluginSettingTab, Setting, normalizePath, Notice } = require("obsidian");

const CANDIDATE_HEADING = "## permanent note candidates";
const LIT_NOTE_TAG = "literature-note";
const PERMANENT_NOTE_TAG = "permanent-note";
// Status/provenance markers that describe the note's role in the workflow,
// not its topic — these never carry over to a promoted note.
const NON_CARRYING_TAGS = new Set([LIT_NOTE_TAG, PERMANENT_NOTE_TAG, "sr-candidate"]);
const CHECKED_ITEM_RE = /^(\s*-\s*\[[xX]\]\s*)(.*)$/;
const SR_TAG_RE = /#sr-candidate\b/gi;
const HEADING_RE = /^#{1,6}\s/;
const ALREADY_LINK_RE = /^\[\[.*\]\]$/;

// Windows-reserved device names; forbidding them keeps a title safe on
// Windows without affecting how it looks on macOS.
const WINDOWS_RESERVED = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
]);

const DEFAULT_SETTINGS = {
  newNoteFolder: "", // "" = same folder as the literature note
  templatePath: "x/Templates/Permanent Note Template.md", // "" = built-in fallback body
};

function sanitizeFilename(name) {
  // Characters illegal in a filename on Windows; this set is a strict
  // superset of what macOS forbids, so filtering to it is safe everywhere.
  let out = name.replace(/[\\/:*?"<>|#^[\]]/g, " ").replace(/\s+/g, " ").trim();
  // Windows also disallows a trailing dot or space.
  out = out.replace(/[. ]+$/, "");
  if (!out) out = "Untitled permanent note";
  out = out.slice(0, 120); // stay well under the 255-char path-component limit
  if (WINDOWS_RESERVED.has(out.toUpperCase())) out = out + " note";
  return out;
}

// Topical tags on the literature note (e.g. course or subject tags a
// student added) carry over to a promoted note; status markers like
// "literature-note" don't — the note is no longer a literature note once
// promoted, it's a permanent note, so that tag is swapped rather than kept.
function carryOverTags(sourceTags) {
  const seen = new Set();
  const carried = [];
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

async function ensureFolder(vault, path) {
  if (!path) return;
  const parts = path.split("/").filter(Boolean);
  let cur = "";
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

module.exports = class SecondReaderPromotePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new SecondReaderPromoteSettingTab(this.app, this));

    // Guards against re-entrancy: our own vault.modify() call below fires
    // another "modify" event for the same file.
    this._processing = new Set();

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        this.handleModify(file).catch((e) => console.error("Second Reader promote:", e));
      })
    );
  }

  async handleModify(file) {
    if (!file || file.extension !== "md") return;
    if (this._processing.has(file.path)) return;

    const cache = this.app.metadataCache.getFileCache(file);
    const fmTags = cache && cache.frontmatter ? cache.frontmatter.tags : null;
    const tagList = Array.isArray(fmTags) ? fmTags : fmTags ? [fmTags] : [];
    const isLiteratureNote = tagList.some(
      (t) => String(t).toLowerCase() === LIT_NOTE_TAG
    );
    if (!isLiteratureNote) return;

    const content = await this.app.vault.read(file);
    if (!content.toLowerCase().includes(CANDIDATE_HEADING)) return;

    const lines = content.split("\n");
    let inSection = false;
    let changed = false;

    this._processing.add(file.path);
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

        const title = rawText.replace(SR_TAG_RE, "").trim();
        if (!title) continue;

        try {
          const newFile = await this.createPermanentNote(title, file, tagList);
          lines[i] = `${m[1]}[[${newFile.basename}]]`;
          changed = true;
        } catch (e) {
          console.error("Second Reader promote failed:", e);
          new Notice(`Second Reader: couldn't create note "${title}" — ${e.message}`);
        }
      }

      if (changed) {
        await this.app.vault.modify(file, lines.join("\n"));
      }
    } finally {
      this._processing.delete(file.path);
    }
  }

  async createPermanentNote(rawTitle, sourceFile, sourceTags) {
    const vault = this.app.vault;
    const folder = this.settings.newNoteFolder
      ? normalizePath(this.settings.newNoteFolder)
      : sourceFile.parent && sourceFile.parent.path !== "/"
      ? sourceFile.parent.path
      : "";

    if (folder) await ensureFolder(vault, folder);

    const base = sanitizeFilename(rawTitle);
    let path = normalizePath(folder ? `${folder}/${base}.md` : `${base}.md`);
    let n = 2;
    while (vault.getAbstractFileByPath(path)) {
      path = normalizePath(folder ? `${folder}/${base} (${n}).md` : `${base} (${n}).md`);
      n++;
    }

    const body = await this.renderNoteBody(rawTitle, sourceFile, sourceTags || []);
    return await vault.create(path, body);
  }

  // Fills {{title}}, {{date}}, {{source}}, {{tags}} in the configured
  // template file. Falls back to a minimal built-in body if no template is
  // configured or it can't be found — promotion should never fail just
  // because the template went missing.
  async renderNoteBody(rawTitle, sourceFile, sourceTags) {
    const today = new Date().toISOString().slice(0, 10);
    const escapedTitle = rawTitle.replace(/"/g, '\\"');
    const tagsValue = [PERMANENT_NOTE_TAG, ...carryOverTags(sourceTags)].join(", ");

    const templatePath = this.settings.templatePath
      ? normalizePath(this.settings.templatePath)
      : "";
    const templateFile = templatePath
      ? this.app.vault.getAbstractFileByPath(templatePath)
      : null;

    if (templateFile && "extension" in templateFile) {
      const raw = await this.app.vault.read(templateFile);
      return raw
        .replace(/\{\{\s*title\s*\}\}/g, escapedTitle)
        .replace(/\{\{\s*date\s*\}\}/g, today)
        .replace(/\{\{\s*source\s*\}\}/g, sourceFile.basename)
        .replace(/\{\{\s*tags\s*\}\}/g, tagsValue);
    }

    if (templatePath) {
      console.warn(
        `Second Reader promote: template not found at "${templatePath}", using built-in fallback.`
      );
    }
    return [
      "---",
      `title: "${escapedTitle}"`,
      "status: permanent",
      `tags: [${tagsValue}]`,
      `created: ${today}`,
      `source: "[[${sourceFile.basename}]]"`,
      "---",
      "",
      `# ${rawTitle}`,
      "",
      "## Related notes",
      `- [[${sourceFile.basename}]]`,
      "",
    ].join("\n");
  }
};

class SecondReaderPromoteSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Second Reader: Promote Candidates" });
    containerEl.createEl("p", {
      text:
        "Checking a box under “## Permanent note candidates” in a note tagged " +
        "literature-note creates a new permanent note and turns that line into a link.",
    });

    new Setting(containerEl)
      .setName("New note folder")
      .setDesc(
        "Where promoted permanent notes are created. Leave blank to use the same " +
          "folder as the literature note."
      )
      .addText((text) =>
        text
          .setPlaceholder("e.g. Permanent notes")
          .setValue(this.plugin.settings.newNoteFolder)
          .onChange(async (value) => {
            this.plugin.settings.newNoteFolder = value.trim();
            await this.plugin.saveData(this.plugin.settings);
          })
      );

    new Setting(containerEl)
      .setName("Template path")
      .setDesc(
        "Vault path to the template used for promoted notes. Supports {{title}}, " +
          "{{date}}, {{source}}, and {{tags}} placeholders — {{tags}} is " +
          "\"permanent-note\" plus the literature note's own tags (its " +
          "literature-note/status tags are dropped, not carried over). Leave " +
          "blank to use a minimal built-in template."
      )
      .addText((text) =>
        text
          .setPlaceholder("x/Templates/Permanent Note Template.md")
          .setValue(this.plugin.settings.templatePath)
          .onChange(async (value) => {
            this.plugin.settings.templatePath = value.trim();
            await this.plugin.saveData(this.plugin.settings);
          })
      );
  }
}
