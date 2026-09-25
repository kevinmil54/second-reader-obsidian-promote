# Setting Up Your Second Reader Note System

This gets your computer ready to take literature notes the Second Reader way:
import a paper from Zotero into a structured note, then read it in Zotero
with your note open right beside it — typing your own notes and highlighting
as you go. One click syncs your highlights into the note as quotes with page
numbers (without touching anything you've typed), and one checkbox promotes
your best ideas into standalone permanent notes. It's a one-time setup
(30–45 minutes) — after that, each new paper takes seconds to turn into a
note.

**Already set up from an earlier version?** Skip to
[Upgrading to Second Reader 2](#upgrading-to-second-reader-2).

Works on **Mac or Windows**. Steps are marked where they differ.

---

## How the pieces fit together

Every paper you read becomes a **Literature note** — your own notes on that
source, plus whatever Second Reader adds. From there, ideas worth keeping on
their own move through four more note types, each with its own top-level
folder in your vault:

- **Permanent notes** — one idea per note, in your own words, built to stand
  alone years from now. You create these by checking a box in a literature
  note.
- **Structure notes** — group and map connections among a cluster of
  Permanent notes on a theme (e.g. "College students are reading less than
  they once did"). Mostly links — an index, not an essay.
- **Evergreen notes** — the polished, written-out synthesis a mature
  Structure note eventually grows into. Closer to a standalone essay than an
  index.
- **Project notes** — the argument-and-evidence framework for something
  you're actually writing (a paper, a talk) — pulls from your Permanent
  notes so you start from a structure instead of a blank page.

```
Literature note → Permanent notes → Structure note → Evergreen note
                                  ↘ Project note
```

A Permanent note's **Connections** section is where you link it to the
Structure, Evergreen, and Project notes that draw on it — you build those
links by hand as your vault grows; nothing does it for you automatically.

---

## 1. Get a good markdown editor

Your notes are plain text files in a format called **Markdown** (`# heading`,
`**bold**`, `[[links]]`). Obsidian (step 2) *is* a markdown editor and will
be where you do almost all your writing — but it's worth having a
lightweight general-purpose one too, for quickly opening a `.md` file
without launching Obsidian.

**Recommended: [Zettlr](https://www.zettlr.com/)** — free, open-source, and
identical on Mac and Windows. Unlike a general code editor, it's built
specifically for academic Markdown writing (citations, footnotes, live
preview), which fits this note-taking system well.

- **Mac:** Download the `.dmg` → open it → drag **Zettlr** to Applications.
- **Windows:** Download the installer → run it → accept the defaults.

**If you work with R or Quarto:** use **[Positron](https://positron.posit.co/)**
instead (or alongside Zettlr) — Posit's IDE built for R, Python, and Quarto
(`.qmd`) documents. Same install pattern on both platforms: download →
run the installer → open.

**Avoid TextEdit (Mac) and WordPad (Windows) for this** unless you switch
them to plain-text mode — both default to rich text and will quietly corrupt
a `.md` file with hidden formatting. Plain Notepad on Windows is fine in a
pinch; on Mac, use TextEdit's **Format → Make Plain Text** first.

---

## 2. Install Obsidian

1. Go to **[obsidian.md](https://obsidian.md/)** and click **Download** — it
   detects your OS automatically.
2. **Mac:** open the downloaded `.dmg`, drag **Obsidian** into Applications,
   launch it.
   **Windows:** run the downloaded installer, launch Obsidian when it
   finishes.
3. On first launch: **Create a new vault** (a vault is just a folder of
   notes). If your instructor gave you a starter vault instead, choose
   **Open folder as vault** and pick that folder.

---

## 3. Install Zotero

Zotero is where your papers live; it's what feeds Obsidian the metadata
(title, authors, citation key) for each note.

1. Go to **[zotero.org/download](https://www.zotero.org/download/)** and
   download **Zotero 7** for your OS.
2. **Mac:** open the `.dmg`, drag Zotero to Applications.
   **Windows:** run the installer.
3. Launch Zotero. Create a free account at zotero.org when prompted, and
   sign in (Zotero → Settings → Sync) — this backs up your library and lets
   you use Zotero on more than one device. Not required, but you'll want it.
4. **Turn on the setting that lets Obsidian talk to Zotero:** Zotero →
   Settings → **Advanced** → check **"Allow other applications to
   communicate with Zotero."** Zotero must be running (in the background is
   fine) whenever you import a note in Obsidian.
5. **Install the Better BibTeX plugin.** This is what generates the stable
   citation key (like `smith2023learning`) and the formatted APA reference
   the templates use — without it, those fields come out blank.
   - Download the latest `.xpi` from
     **[the Better BibTeX releases page](https://github.com/retorquere/zotero-better-bibtex/releases/latest)**
     (the file named `zotero-better-bibtex-X.X.X.xpi`).
   - In Zotero: **Tools → Plugins** → gear icon (top right) → **"Install
     Plugin From File..."** → select the downloaded `.xpi`.
   - Restart Zotero.

### 3a. Install the Zotero Connector (browser extension)

This is what saves an article into Zotero straight from your browser.

1. Go to **[zotero.org/download](https://www.zotero.org/download/)** and
   scroll to **"Zotero Connector."** It detects your browser (Chrome,
   Firefox, Edge, Safari) and gives you the right install button.
2. Click it, then confirm the install in your browser's extension store.
3. **To use it:** open an article's webpage (or its PDF), click the Zotero
   icon that appears in your browser's toolbar. It saves the citation info —
   and the PDF, when available — into whichever collection is currently
   selected in the Zotero app. Zotero must be open for this to work.

---

## 4. Set up Obsidian for the Second Reader note system

### Vault folders
Create six folders at the top level of your vault (in Obsidian's file
explorer, right-click the vault's root → **New folder**, once per name):

**Templates**, **Literature notes**, **Permanent notes**, **Structure
notes**, **Evergreen notes**, **Project notes**

Everything below — the plugin's defaults, the import format, the
templates' Connections section — assumes these exist with these exact
names (plain spaces, no underscores or abbreviations).

### a. Turn on community plugins
Settings (gear icon) → **Community plugins** → **Turn on community
plugins** (you'll see a one-time warning about third-party code — this is
expected).

### b. Install "BRAT"
Settings → Community plugins → **Browse** → search **"BRAT"** (Beta
Reviewers Auto-update Tool) → **Install** → **Enable**. BRAT is what lets
you install the Second Reader plugin below, which isn't in Obsidian's
official plugin list.

### c. Install "Second Reader"
One plugin does everything: imports papers from Zotero, syncs your
highlights, and promotes permanent-note candidates. You **don't** need the
separate "Zotero Integration" community plugin — Second Reader includes it.

1. Command Palette (`Cmd/Ctrl+P`) → **"BRAT: Add a beta plugin for
   testing."**
2. Paste: `kevinmil54/second-reader-obsidian-promote`
3. When asked for a version, **pick the specific version number (e.g.
   `2.0.0` — check the [releases page](https://github.com/kevinmil54/second-reader-obsidian-promote/releases)
   for the latest) rather than "Latest version"** — "Latest version" has
   failed to install for some people even though a specific number works
   fine.
4. Settings → Community plugins → enable **"Second Reader."** If it doesn't
   take effect right away, reload Obsidian (Command Palette → "Reload app
   without saving") and try again — this has occasionally needed a couple
   of tries.
5. **If you have the "Zotero Integration" plugin from another class, turn
   it off** (Settings → Community plugins) — otherwise you'll see two sets
   of look-alike commands. Second Reader reminds you with a message until
   you do.

### d. Get the two templates into your vault
Your instructor will give you two files — **`Literature Note Template -
Zotero Import.md`** and **`Permanent Note Template.md`** — or you can get
them from
**[the class repo's Templates folder](https://github.com/kevinmil54/second-reader-obsidian-promote/tree/main/Templates)**
(open each file there and use the download button). Put both into the
`Templates` folder you created above.

### e. Check the promote settings
Settings → **Second Reader** → **Promote candidates** (at the top). It
already defaults to `Templates/Permanent Note Template.md` for **Template
path** and `Permanent notes` for **New note folder** — check both match
where you put things, and adjust if you used different folder names.

### f. Set up the import format
Same Settings page, further down under **Zotero import & highlight sync** →
**Import Formats** → add a new format:
- **Name:** **"Literature Note"** — this name matters (see the note below).
- **Template:** the path to `Templates/Literature Note Template - Zotero
  Import.md`
- **Output path template:** `Literature notes/{{citekey}}.md`
- **Bibliography Style:** search **"APA"** → choose **American Psychological
  Association 7th edition**

**Important:** once you save this, Obsidian gets a *new* command named after
it — **"Second Reader: Literature Note."** That's the command you'll use to
create every literature note. (The command always takes the format's name,
so if you named your format something else — or upgraded from an earlier
version with a differently named format — look for "Second Reader:" followed
by that name.)

### g. (Optional, recommended) Auto-open imported notes
Same Settings page → toggle **"Open the created or updated note(s) after
import"** on, so each new literature note opens automatically.

### h. (Optional, recommended) A shortcut for syncing highlights
Settings → **Hotkeys** → search **"Sync highlights"** → click `+` → press a
shortcut you'll remember (e.g. `Cmd/Ctrl + Shift + S`).

---

## Reading a paper: notes and highlights together

Once setup is done, this is the whole routine per paper.

### Before you start reading

1. **Get the article into Zotero.** On the article's webpage, click the
   Zotero Connector button in your browser (best — pulls in full metadata).
   Or drag the PDF straight into the Zotero app window.
2. **Check it saved correctly** — title, authors, and year look right in
   Zotero. If you dragged in a bare PDF and the fields are empty, right-click
   the item → **"Retrieve Metadata for PDF."**
3. **Create the literature note.** In Obsidian: Command Palette →
   **"Second Reader: Literature Note"** (the command named after your import
   format from step 4f). Search for the article by title or author and
   select it. Obsidian creates the note, pre-filled with title, authors,
   year, the Zotero link, and the full APA reference.

### While you read

4. **Put the paper and the note side by side.** Open the PDF in **Zotero's
   own reader** (double-click the PDF in Zotero) on one half of your screen,
   and your literature note in Obsidian on the other.
   - **Mac:** hover over a window's green button → **Tile Window to Left of
     Screen**, then click the other window to fill the right side.
   - **Windows:** press `Win + ←` in one window, then pick the other window
     to fill the right side.
5. **Type and highlight in whatever rhythm suits you.** Highlight passages
   worth keeping in Zotero, and add a comment to a highlight when you have
   a reaction (click the highlight, then type in its comment box). At the
   same time, type your own notes into the literature note — "Summary (in my
   own words)," "Key ideas," questions as they occur to you.
   Highlight in **Zotero's** reader, not Preview or Adobe — Zotero's reader
   is what records the real (printed) page number for each highlight.
6. **Sync whenever you like** — after each section, or only at the end.
   With your literature note open, click the **highlighter icon** in
   Obsidian's left-hand ribbon (or Command Palette → **"Second Reader: Sync
   highlights into current note"**, or your shortcut from step 4h). Every
   highlight and comment made since your last sync appears under **"Quotes
   worth keeping,"** each with its page number. Nothing you've typed is
   touched — it's safe to sync in the middle of a sentence.
   - Edit, trim, or react to imported quotes freely; syncing again won't
     undo your edits or duplicate quotes.
   - You can move a quote into another section (say, next to the idea it
     supports) — it won't be re-added to the Quotes section.
   - Each quote ends with a code like `^nb-ABCD1234`. Leave it: it's how
     sync knows the quote is already in your note, and it lets you link to
     that exact quote from a permanent note.

### Promoting ideas

7. When an idea is worth its own standalone note, write its title in your
   own words under **"Permanent note candidates."** Want to add more before
   promoting it? Press **Enter, then Tab** right after the title to write an
   indented line or two — that carries over into the new note too.
8. **Check its box** — a new permanent note is created automatically, built
   from the Permanent Note Template, and that line becomes a link to it.
9. **Coming back to the paper later?** Keep highlighting in Zotero and sync
   again — new highlights are added and everything else stays as you left
   it.
10. Over time, gather related Permanent notes into a **Structure note** (in
   your `Structure notes` folder); once that synthesis is dense enough,
   write it up as an **Evergreen note**. Use **Project notes** when you're
   actually writing something and want to pull together the Permanent notes
   that support it. Link back to a Permanent note's **Connections** section
   as you build these.

---

## Getting updates later

The plugin improves from time to time. To pick up a new version:

- **Manual:** Command Palette → **"BRAT: Check for updates to all beta
  plugins and UPDATE."**
- **Automatic:** Settings → **BRAT** → enable **"Auto-update plugins at
  startup"** — then every time you open Obsidian, it checks and updates in
  the background.

If you installed by picking a **specific version number** rather than
"Latest version" (step 4c, if you hit that BRAT hiccup), the update check
might not pick up the new release. If "Check for updates" doesn't move you
forward, remove the plugin (Command Palette → **"BRAT: Remove a beta
plugin"**) and re-add it — that always works.

Templates don't auto-update — if a template changes, re-download it from
**[the class repo](https://github.com/kevinmil54/second-reader-obsidian-promote/tree/main/Templates)**
and replace your copy.

### Upgrading to Second Reader 2

Version 2 folds Zotero import into Second Reader and adds highlight sync.
If you set things up with an earlier version (Promote Candidates plus the
separate Zotero Integration plugin):

1. **Update Second Reader** as described above. It's the same plugin, so
   your promote settings carry over. After updating, restart Obsidian; the
   plugin is now listed as **"Second Reader"** (version 2.0.0 or later).
2. **Your Zotero import format carries over automatically** the first time
   Second Reader 2 starts — you'll see a message saying so. Your import
   command is now called **"Second Reader: Literature Note"** (instead of
   "Zotero Integration: Literature Note").
3. **Turn off the "Zotero Integration" plugin** (Settings → Community
   plugins). Second Reader shows a reminder until you do.
4. **Replace your literature-note template** with the new one from
   [the class repo](https://github.com/kevinmil54/second-reader-obsidian-promote/tree/main/Templates)
   — the highlight sync needs it. Notes you've already created keep working;
   to use sync in an existing note, copy its **"Quotes worth keeping"**
   section from a newly created note, or just sync — Second Reader adds the
   missing quotes block under that heading for you.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Second Reader: Literature Note" doesn't appear in the Command Palette | Plugin isn't enabled, the import format isn't set up yet (step 4f), or Obsidian needs a full restart (not just a reload). If you upgraded, look for "Second Reader: …" — the old "Zotero Integration: …" names are gone. |
| An import made an empty note titled with just the citekey (e.g. `smith2023learning`) | That came from the old generic "Import notes" command, which ignores your template (Second Reader 2.0.1 and later no longer have it). Delete the empty note and use the command named after your import format ("Second Reader: Literature Note"). |
| Every Zotero command appears twice | The old "Zotero Integration" plugin is still on — turn it off in Settings → Community plugins. |
| Import or sync fails / "could not connect to Zotero" / "is Zotero running?" | Zotero desktop must be running. Check Zotero → Settings → Advanced → "Allow other applications to communicate with Zotero" is checked. |
| Sync says "No new highlights" but you just highlighted | The highlights were made in another PDF app (Preview, Adobe) — make them in **Zotero's** PDF reader. Also check that the note you have open is the literature note for that paper. |
| Sync says the note "has no citekey in its frontmatter" | Sync only works in a literature note created by the import command, which records the paper's citekey at the top of the note. Don't delete the `citekey:` line. |
| Quotes show the PDF's sheet number instead of the printed page | The PDF's page numbering is missing or wrong. In Zotero's reader, right-click a page in the thumbnails sidebar → **Rename Page…** to set the correct number; future syncs will use it (quotes already synced keep their old number — edit them by hand). |
| A quote I deleted from the note came back after syncing | Syncing adds any highlight that isn't in the note yet. To remove a quote for good, delete the highlight in Zotero too. |
| A highlight you deleted in Zotero is still in the note | Syncing only *adds* quotes; it never removes them. Delete the quote in Obsidian by hand. |
| Citation key or reference comes out blank, or shows `{{citekey}}` literally | Better BibTeX isn't installed, or Zotero wasn't restarted after installing it. |
| Import errors on a paper with no publication year | Fixed as of the current template — if you're on an older copy, update to the latest from [the class repo](https://github.com/kevinmil54/second-reader-obsidian-promote/tree/main/Templates). |
| Checking a candidate box just crosses out the text — no new note appears | The "Second Reader" plugin isn't enabled, the note's frontmatter is missing `tags: [literature-note]`, or the heading isn't exactly `## Permanent note candidates`. |
| BRAT can't find the plugin, or "Latest version" won't install | Double-check the repo name is exactly `kevinmil54/second-reader-obsidian-promote`. If "Latest version" fails, pick the specific version number from the dropdown instead. |
| Reference style isn't APA | You likely set the "Citation Style" (used for inline citations) instead of the **Import Format's own "Bibliography Style"** field — these are two separate settings in the plugin. |
