# Setting Up Your Second Reader Note System

This gets your computer ready to take literature notes the Second Reader way:
import a paper from Zotero into a structured note, take your own notes, and
promote your best ideas into standalone permanent notes with one click. It's
a one-time setup (30–45 minutes) — after that, each new paper takes seconds
to turn into a note.

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

### b. Install "Zotero Integration"
Settings → Community plugins → **Browse** → search **"Zotero Integration"**
→ **Install** → **Enable**.

### c. Install "BRAT"
Same **Browse** search, this time for **"BRAT"** (Beta Reviewers Auto-update
Tool) → **Install** → **Enable**. BRAT is what lets you install the custom
Second Reader plugin below, which isn't in Obsidian's official plugin list.

### d. Install "Second Reader: Promote Candidates"
1. Command Palette (`Cmd/Ctrl+P`) → **"BRAT: Add a beta plugin for
   testing."**
2. Paste: `kevinmil54/second-reader-obsidian-promote`
3. When asked for a version, **pick the specific version number (e.g.
   `1.2.0` — check the [releases page](https://github.com/kevinmil54/second-reader-obsidian-promote/releases)
   for the latest) rather than "Latest version"** — "Latest version" has
   failed to install for some people even though a specific number works
   fine.
4. Settings → Community plugins → enable **"Second Reader: Promote
   Candidates."** If it doesn't take effect right away, reload Obsidian
   (Command Palette → "Reload app without saving") and try again — this has
   occasionally needed a couple of tries.

### e. Get the two templates into your vault
Your instructor will give you two files — **`Literature Note Template -
Zotero Import.md`** and **`Permanent Note Template.md`** — or you can get
them from
**[the class repo's Templates folder](https://github.com/kevinmil54/second-reader-obsidian-promote/tree/main/Templates)**
(open each file there and use the download button). Put both into the
`Templates` folder you created above.

### f. Point the plugin at the permanent-note template
Settings → **Second Reader: Promote Candidates**. It already defaults to
`Templates/Permanent Note Template.md` for **Template path** and
`Permanent notes` for **New note folder** — check both match where you put
things, and adjust if you used different folder names.

### g. Configure Zotero Integration's import format
Settings → **Zotero Integration** → **Import Formats** → add a new format:
- **Name:** something clear, e.g. **"Literature Note"** — this name matters
  (see the note below).
- **Template:** the path to `Templates/Literature Note Template - Zotero
  Import.md`
- **Output path template:** `Literature notes/{{citekey}}.md`
- **Bibliography Style:** search **"APA"** → choose **American Psychological
  Association 7th edition**

**Important:** once you save this, Obsidian gets a *new* command named after
it — **"Zotero Integration: Literature Note"** (or whatever you named it) —
not the generic **"Zotero Integration: Import notes."** That generic command
skips your template entirely and creates a bare note with just the citekey.
Always use the one named after your format.

### h. (Optional, recommended) Auto-open imported notes
Same Settings page → toggle **"Open the created or updated note(s) after
import"** on, so each new literature note opens automatically.

---

## Generating a note for a particular article

Once setup is done, this is the whole routine per paper:

1. **Get the article into Zotero.** On the article's webpage, click the
   Zotero Connector button in your browser (best — pulls in full metadata).
   Or drag the PDF straight into the Zotero app window.
2. **Check it saved correctly** — title, authors, and year look right in
   Zotero. If you dragged in a bare PDF and the fields are empty, right-click
   the item → **"Retrieve Metadata for PDF."**
3. **In Obsidian:** Command Palette → the command named after your import
   format from step 4g (e.g. **"Zotero Integration: Literature Note"**) —
   **not** the generic "Zotero Integration: Import notes," which skips your
   template.
4. Search for the article by title or author, select it (you can multi-select
   several at once).
5. Obsidian creates the literature note, pre-filled with title, authors,
   year, the Zotero link, and the full APA reference.
6. **Read and take your own notes** directly in that file — fill in "Why I'm
   reading this," "Summary (in my own words)," "Key ideas," and so on as you
   go.
7. When an idea is worth its own standalone note, write its title in your
   own words under **"Permanent note candidates."** Want to add more before
   promoting it? Press **Enter, then Tab** right after the title to write an
   indented line or two — that carries over into the new note too.
8. **Check its box** — a new permanent note is created automatically, built
   from the Permanent Note Template, and that line becomes a link to it.
9. Over time, gather related Permanent notes into a **Structure note** (in
   your `Structure notes` folder); once that synthesis is dense enough,
   write it up as an **Evergreen note**. Use **Project notes** when you're
   actually writing something and want to pull together the Permanent notes
   that support it. Link back to a Permanent note's **Connections** section
   as you build these.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Your import format's command doesn't appear in the Command Palette | Plugin isn't enabled, or Obsidian needs a full restart (not just a reload) after enabling it. |
| "Zotero Integration: Import notes" creates a blank note with just a citekey, no content | That's the generic command — it doesn't use your template. Use the command named after your import format instead (e.g. "Zotero Integration: Literature Note"), set up in step 4g. |
| Import fails / "could not connect to Zotero" | Zotero desktop must be running. Check Zotero → Settings → Advanced → "Allow other applications to communicate with Zotero" is checked. |
| Citation key or reference comes out blank, or shows `{{citekey}}` literally | Better BibTeX isn't installed, or Zotero wasn't restarted after installing it. |
| Import errors on a paper with no publication year | Fixed as of the current template — if you're on an older copy, update to the latest from [the class repo](https://github.com/kevinmil54/second-reader-obsidian-promote/tree/main/Templates). |
| Checking a candidate box just crosses out the text — no new note appears | The "Second Reader: Promote Candidates" plugin isn't enabled, the note's frontmatter is missing `tags: [literature-note]`, or the heading isn't exactly `## Permanent note candidates`. |
| BRAT can't find the plugin, or "Latest version" won't install | Double-check the repo name is exactly `kevinmil54/second-reader-obsidian-promote`. If "Latest version" fails, pick the specific version number from the dropdown instead. |
| Reference style isn't APA | You likely set the "Citation Style" (used for inline citations) instead of the **Import Format's own "Bibliography Style"** field — these are two separate settings in Zotero Integration. |
