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
- **Progress-colored syllabus links.** Links to literature notes show
  whether the student has made the note, synced highlights into it, or
  written in it.
- **"open pdf" that works for every student.** A class copy of the
  instructor's syllabus links each reading through the student's own
  literature note to their own copy of the PDF.
- **Package a week's notes for upload.** A link under each week of the
  class copy of the syllabus zips the student's literature notes for that
  week (one file per reading, the student's name in the zip's name) and
  shows the zip, ready for Canvas.
- **Promote candidates.** Checking a box under `## Permanent note candidates`
  in a note tagged `literature-note` creates a permanent note from a
  template and turns the line into a link to it.

Students' setup instructions: [STUDENT-SETUP-GUIDE.md](STUDENT-SETUP-GUIDE.md).
Students upgrading from 1.x: [UPDATING.md](UPDATING.md).
Overview of what's new and how to use it: [UPDATE-REPORT-2.3.md](UPDATE-REPORT-2.3.md).

Desktop only (macOS, Windows, Linux) — Zotero import talks to the Zotero
desktop app and runs a PDF helper, which Obsidian mobile can't do.

## Install

1. In Obsidian, open Settings → Community plugins and turn off Restricted
   mode if it's on.
2. Click Browse, search for "Second Reader", and click Install.
3. Click Enable.
4. Open Settings → Second Reader and click the download button next to
   "PDF Utility". Highlight sync and PDF import need it.

Requires Zotero 7 with the Better BibTeX plugin, and Zotero's "Allow other
applications to communicate with Zotero" setting turned on.

### Installing through BRAT

Until Second Reader appears in the community directory, install it with
BRAT instead of steps 1–3:

1. Install the **BRAT** community plugin (Settings → Community plugins →
   Browse → search "BRAT").
2. Command Palette → **"BRAT: Add a beta plugin for testing."**
3. Paste this repo: `kevinmil54/second-reader-obsidian-promote`
4. Enable **"Second Reader"** in Settings → Community plugins.

If you installed it through BRAT and it's now in the directory, open BRAT's
settings and remove `kevinmil54/second-reader-obsidian-promote` from its list
of beta plugins, leaving Second Reader installed. Obsidian then updates it
from the community directory. The plugin ID hasn't changed, so your settings
carry over.

## Keeping figures and tables

To keep a figure or table, draw a box around it with the select-area tool in
Zotero's PDF reader, then sync highlights. The image comes into the note
under "Quotes worth keeping" with its page number. To add a screenshot from
somewhere else, put it in the note's "Figures & images" section with
`![[filename]]`.

## Network use and access outside your vault

Second Reader works with the Zotero desktop app and a small PDF utility, so it
does a few things beyond reading and writing notes in your vault.

### Network use

- **Zotero on your own computer.** The plugin talks to Zotero's Better BibTeX
  plugin at `http://127.0.0.1` (port 23119 for Zotero, 24119 for Juris-M, or a
  port you set). This is how it looks up citations, imports papers, and reads
  your highlights. The connection stays on your computer.
- **Downloading the PDF utility from GitHub.** Highlight sync and PDF import use
  [pdfannots2json](https://github.com/mgmeyers/pdfannots2json), a program by
  mgmeyers that reads annotations out of PDF files. Second Reader downloads the
  version for your operating system from that project's GitHub releases page.
  The first download happens when you click the download button next to
  "PDF Utility" in the plugin's settings. After a Second Reader update that
  needs a newer version of the utility, the plugin downloads it again when
  Obsidian starts. To manage the utility yourself, enter the path to your own
  copy under "PDF Utility Path Override" in the settings, and Second Reader
  will never download it.

The plugin makes no other network connections. It does not send your notes,
highlights or reading activity anywhere, and it collects no usage data.

### Files and programs outside your vault

- **Zotero attachments.** To import highlights and images, the plugin reads PDF
  files and image files from Zotero's storage folder and copies the images it
  needs into your vault.
- **Running the PDF utility.** The plugin runs pdfannots2json on the PDF you're
  importing from. It also runs Tesseract, if you've installed it and turned on
  "Image OCR" in the settings.
- **Showing a week's package.** Packaging a week's notes makes a zip file in the
  vault's `Uploads` folder and then opens Finder (or Explorer) to show it.

No account or payment is needed. Second Reader is free and open source under
the GPL-3.0 license.

## Upgrading from 1.x (Promote Candidates + Zotero Integration)

The plugin id is unchanged (`second-reader-promote`), so BRAT updates 1.x
installs in place and promote settings carry over. On first start, 2.x copies
the import formats and other settings from the community **Zotero
Integration** plugin (`obsidian-zotero-desktop-connector`), then shows a
reminder until that plugin is turned off. Commands are renamed from
"Zotero Integration: …" to "Second Reader: …".

## For instructors: preparing a class

Students get the readings as a Zotero RDF file and the syllabus as an
Obsidian note. Each student's notes are built from *their own* Zotero copy
of each reading, so highlight sync and "open pdf" work on their machine and
their highlights stay private.

**1. Export the readings from Zotero.** Right-click the course collection →
**Export Collection…** → Format **Zotero RDF**:
- check **Export Files** (so the PDFs are included);
- uncheck **Export Notes** (your Zotero notes stay yours);
- if **Include Annotations** appears, leave it **unchecked** — otherwise
  your highlights are written into the students' PDFs.

Zip the exported folder (the `.rdf` file plus its `files` folder) and post
it on Canvas. Students import it per the setup guide (step 3b). For readings
added later, export just those into a new file.

Item IDs and citekeys are not preserved by an import — each student's Zotero
assigns its own — which is why the syllabus can't link straight to PDFs and
uses the student's literature note instead (below).

**2. Make the students' copy of the syllabus.** Keep one master syllabus in
your own vault, with your own `zotero://open-pdf/...` links (they work only
on your computer). Open it and run **"Second Reader: Make class copy of
syllabus."** It writes `<syllabus name> - student copy.md` next to it, with
every Zotero link rewritten to
`obsidian://second-reader?open-pdf=<literature note title>` — the literature
note named on the same line (the link after "Literature note:", else the
line's first `[[link]]`). On a student's computer that opens *their* copy:
the note's `pdf:` property, or, for notes made before 2.2, the PDF found in
Zotero by the note's citekey (then saved into the note). Zotero links with no
note on their line become plain text and are listed in the notice.
Literature-note links are also pointed at the name each student's import
will give the note — computed from the linked note's `title` with the
import's file-name rules — when that differs from your note's name (e.g. a
Zotero title ending in a period); they keep displaying as written
(`[[Student name|Your name]]`). Re-run
the command after every syllabus edit; the copy carries a do-not-edit banner.

Literature-note links in the syllabus only resolve if students keep the
note names the import produces, so the output path template should name
notes the way the syllabus links do (e.g. `Literature notes/{{title}}.md`).

**Packaging links.** The class copy also gets a line under every `Week N`
heading (any heading level) whose section links to a note:
`[Package my Week N literature notes for upload](obsidian://second-reader?package-week=N&syllabus=<copy name>)`.
On a student's computer it collects the literature notes linked in that
week's section that the student has made, writes
`Uploads/<course> Week NN literature notes - <student name>.zip` (the notes
sit in a folder of that name inside the zip, with any embedded images under
`attachments/`), and shows the zip in Finder or Explorer. `<course>` comes
from the syllabus's `course` property ("ED 336/536 & …" → "ED 336"). The
notes are copied only into the zip, never into the vault, so they can't make
`[[links]]` ambiguous. Readings without a note, and notes that are still blank (nothing but
template text, as for link colors), are skipped and named in the notice. The student's name is asked for once and stored in the plugin
settings.

**3. Link colors.** Any link to a literature note (frontmatter `citekey` or
tag `literature-note`) is colored by the student's progress, in reading view
and the editor: no class while the note doesn't exist (Obsidian's unresolved
style), `sr-lit-untouched`, `sr-lit-highlights`, `sr-lit-worked`. Colors are
the CSS variables `--sr-lit-highlights-color` and `--sr-lit-worked-color`
(yellow and green by default) — override them in a CSS snippet. "Worked"
means any body line that isn't template text (`src/litNoteState.ts`; the
import formats' own template files count as template text too);
frontmatter and synced quotes don't count.

## Zotero links in handed-out notes

Literature notes from early course packages have an empty `zotero:` property and no "Open PDF · Open in Zotero" line under the title. Second Reader fills these in when Obsidian starts, when the student clicks "open pdf" for that reading, and when they sync highlights into the note; **Second Reader: Fill in Zotero links in literature notes** does it for every note at once. Only those lines change (and a `pdf:` property is added if missing), so nothing a student has written is touched (`src/zoteroLinks.ts`).

## Course updates

To send students new or revised literature notes partway through a term, give them a folder that holds `Literature notes/` (and, if needed, `Attachments/` and `Templates/`). Students put the whole folder anywhere in their vault and run **Second Reader: Bring in course update (new literature notes)** from the command palette. For each note in the update:

- if the student has no note with that name, it's added to `Literature notes/`;
- if the student's note is still blank (only template text), it's replaced with the new version;
- if the student has written anything in it or synced highlights into it, it's left alone.

Images and other files are added only where nothing with that name exists, and the update's templates replace the vault's. The update folder then goes to the trash, so no note name appears twice. A message lists the notes that were kept.

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
highlight import (no `newAnnotations`) or the PDF link (no `pdfURI`), the
plugin offers to upgrade it: at
startup (until declined for that plugin version), before a sync (only if
highlight import is missing — the sync would add nothing, so it's blocked if
declined), before an import (optional), and via
**"Update literature-note template."** Only the `## Quotes worth keeping`
section and the `pdf:` / Open PDF lines are patched, so other customizations
survive; the old file is first
saved as `… (before Second Reader update).md`. Templates without that heading
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

**Changing the literature-note template:** before committing a change to
`Templates/Literature Note Template - Zotero Import.md`, append the outgoing
version to `src/pastLiteratureTemplates.md`, followed by a line containing
only `<<<SECOND-READER-TEMPLATE-VERSION>>>`. That file is how the link colors
recognize template text in notes students made with older templates;
without it, an untouched old note would show as "worked." The tests render
every past version and check that it reads as untouched and upgrades
cleanly. The current template is bundled into `main.js`, so template changes
ship with a plugin release.

**Releasing:** bump `version` in `manifest.json` and `package.json`, add it
to `versions.json`, build, then create a GitHub release tagged with the
version (no `v` prefix) with `main.js`, `manifest.json`, and `styles.css`
attached. `main.js` is build output and isn't committed.
