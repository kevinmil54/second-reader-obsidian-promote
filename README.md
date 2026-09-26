# Second Reader

An Obsidian plugin for the [Second Reader](https://github.com/kevinmil54/second-reader)
literature-note workflow. One plugin covers the whole loop:

- **Import a paper from Zotero** into a structured literature note (title,
  authors, citekey, APA reference).
- **Sync highlights while you type.** Read in Zotero's PDF reader with the
  note open beside it; click the highlighter button at the top-right of the
  note (also in the left ribbon), or run
  **"Sync highlights into current note"**, and every new highlight and
  comment lands under "Quotes worth keeping" with its printed page number —
  without touching anything typed in the note.
- **Promote candidates.** Checking a box under `## Permanent note candidates`
  in a note tagged `literature-note` creates a permanent note from a
  template and turns the line into a link to it.

Students' setup instructions: [STUDENT-SETUP-GUIDE.md](STUDENT-SETUP-GUIDE.md).
Students upgrading from 1.x: [UPDATING.md](UPDATING.md).

Desktop only (macOS, Windows, Linux) — Zotero import talks to the Zotero
desktop app and runs a PDF helper, which Obsidian mobile can't do.

## Install via BRAT (gets updates automatically)

1. Install the **BRAT** community plugin (Settings → Community plugins →
   Browse → search "BRAT").
2. Command Palette → **"BRAT: Add a beta plugin for testing."**
3. Paste this repo: `kevinmil54/second-reader-obsidian-promote`
4. Enable **"Second Reader"** in Settings → Community plugins.

Requires Zotero 7 with the Better BibTeX plugin, and Zotero's "Allow other
applications to communicate with Zotero" setting turned on.

## Upgrading from 1.x (Promote Candidates + Zotero Integration)

The plugin id is unchanged (`second-reader-promote`), so BRAT updates 1.x
installs in place and promote settings carry over. On first start, 2.x copies
the import formats and other settings from the community **Zotero
Integration** plugin (`obsidian-zotero-desktop-connector`), then shows a
reminder until that plugin is turned off. Commands are renamed from
"Zotero Integration: …" to "Second Reader: …".

## Templates

- **Literature Note Template - Zotero Import.md** — set as the template of
  an Import Format (plugin settings → Zotero import & highlight sync → Import
  Formats). Sync uses the format whose template path contains "Literature
  Note" (else the first format).
- **Permanent Note Template.md** — filled in when a candidate is promoted.
  Supports `{{title}}`, `{{date}}`, `{{source}}`, `{{tags}}`, `{{details}}`.

## Template upgrades

The current literature-note template ships inside the plugin (esbuild text
loader; `jest.text-transform.js` does the same for tests). If an import
format points at a Second Reader literature-note template that predates
highlight import (no `newAnnotations`), the plugin offers to upgrade it: at
startup (until declined once), before a sync (which it blocks if declined,
since the sync would add nothing), before an import (optional), and via
**"Update literature-note template."** Only the `## Quotes worth keeping`
section is replaced, so other customizations survive; the old file is first
saved as `… (before Second Reader 2).md`. Templates without that heading
are never touched (`src/templateUpgrade.ts`).

## How highlight sync works

Quotes live in a plugin-owned block (`%% begin annotations %% … %% end
annotations %%`, hidden in Live Preview). Sync and re-import touch only that
block, through the live editor when the note is open, so typed text, cursor,
undo history, and unsaved keystrokes are preserved; if a student edits a
quote while Zotero is being queried, their edit wins and new quotes are
appended after it. Each quote carries a block id `^nb-<Zotero annotation
key>`; a highlight is added only if its id isn't already anywhere in the
note, so edited, trimmed, or moved quotes are never duplicated (and can be
linked to: `[[smith2023#^nb-ABCD1234]]`). Re-importing an existing note
never overwrites it. Page numbers use Zotero's page label (the printed page)
and fall back to the PDF page.

Template variables added for this: `newAnnotations` (annotations not yet in
the note) and `a.nbId` (the block-id-safe annotation id).

## Development

The Zotero import code is a fork of
[obsidian-zotero-integration](https://github.com/mgmeyers/obsidian-zotero-integration)
v3.2.1 by mgmeyers, which is GPL-3.0; this plugin is therefore distributed
under GPL-3.0 ([LICENSE.md](LICENSE.md)). Changes from upstream: highlight
sync and merge-instead-of-overwrite (`src/bbt/sync.ts`, `src/bbt/export.ts`),
the promote feature (`src/promote.ts`), a one-time settings import from the
upstream plugin, the PDF helper stored in this plugin's own folder instead of
upstream's hardcoded one, and a fix for first-page highlights getting no page
number.

```sh
npm install
npm test         # one known upstream failure: "sanely handles new lines"
npm run build    # produces main.js
```

**Releasing:** bump `version` in `manifest.json` and `package.json`, add it
to `versions.json`, build, then create a GitHub release tagged with the
version (no `v` prefix) with `main.js`, `manifest.json`, and `styles.css`
attached. `main.js` is build output and isn't committed.
