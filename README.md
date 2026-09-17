# Second Reader: Promote Candidates

An Obsidian plugin: checking a box under `## Permanent note candidates` in a
note tagged `literature-note` creates a new permanent note (from a
configurable template) and turns that line into a link to it. Built for the
[Second Reader](https://github.com/kevinmil54/second-reader) project's
Zettelkasten workflow.

Pure Obsidian-API plugin — no OS-specific code — so it behaves identically on
macOS, Windows, and Linux.

## Install via BRAT (recommended — gets updates automatically)

1. Install the **BRAT** community plugin (Settings → Community plugins →
   Browse → search "BRAT").
2. Command Palette → **"BRAT: Add a beta plugin for testing."**
3. Paste this repo: `kevinmil54/second-reader-obsidian-promote`
4. Enable **"Second Reader: Promote Candidates"** in Settings → Community
   plugins.

## Install manually

1. Download `main.js` and `manifest.json` from this repo (or the latest
   [Release](../../releases)).
2. Create a folder `<your vault>/.obsidian/plugins/second-reader-promote/`
   and put both files in it.
3. Reload Obsidian (Command Palette → "Reload app without saving," or fully
   restart), then enable the plugin in Settings → Community plugins.

## Templates

`Templates/` has the two templates this plugin and the wider Second Reader
workflow are built around:

- **Literature Note Template - Zotero Import.md** — used with the Zotero
  Integration community plugin's "Import Notes" command.
- **Permanent Note Template.md** — what the plugin fills in when a candidate
  is promoted. Point the plugin's "Template path" setting at wherever you
  put this file (default: `Templates/Permanent Note Template.md`).

## Settings

- **New note folder** — where promoted notes are created. Blank = same
  folder as the literature note.
- **Template path** — vault path to the permanent-note template. Supports
  `{{title}}`, `{{date}}`, `{{source}}` placeholders. Blank = a minimal
  built-in template.
