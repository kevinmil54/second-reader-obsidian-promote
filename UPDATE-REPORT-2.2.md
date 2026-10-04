# Second Reader 2.2 — Update Report

*October 4, 2026 · Kevin F. Miller*

Second Reader is an Obsidian plugin for taking literature notes on academic
readings. As of version 2, it is a **single plugin** that imports papers
from Zotero, brings your Zotero highlights into your notes as quotes with
page numbers, links each reading in the syllabus to your own copy of the
PDF, shows your progress through the readings, and promotes your best ideas
into permanent notes.

This report covers what's new, how to install or update, and how to use
Second Reader as an instructor or as a student.

**Quick links:**
[New setup guide](STUDENT-SETUP-GUIDE.md) ·
[Updating from version 1](UPDATING.md) ·
[Technical README](README.md) ·
[Releases](https://github.com/kevinmil54/second-reader-obsidian-promote/releases)

---

## Contents

1. [Key features](#1-key-features)
2. [What changed, version by version](#2-what-changed-version-by-version)
3. [Requirements](#3-requirements)
4. [Installing or updating](#4-installing-or-updating)
5. [Using Second Reader as an instructor](#5-using-second-reader-as-an-instructor)
6. [Using Second Reader as a student](#6-using-second-reader-as-a-student)
7. [Troubleshooting the most common problems](#7-troubleshooting-the-most-common-problems)
8. [Known limitations](#8-known-limitations)

---

## 1. Key features

### One plugin for the whole workflow
Earlier versions needed two plugins: "Second Reader: Promote Candidates"
and the community "Zotero Integration" plugin. Second Reader now includes
everything Zotero Integration did. Students who upgrade keep their settings:
Second Reader copies their Zotero import setup over automatically the first
time it starts.

### Highlight while you take notes, then sync
Students read a paper in Zotero's PDF reader with their literature note open
beside it, highlighting and typing in whatever order suits them. Clicking
the **highlighter button** at the top-right of the note brings every new
highlight and comment into the **"Quotes worth keeping"** section:

- each quote shows its **printed page number** (the journal's page, not the
  PDF's page count);
- comments attached to a highlight appear under its quote;
- **nothing the student has typed is ever changed**, so it's safe to sync
  mid-sentence;
- quotes are never duplicated, even if the student edits, trims, or moves
  them to another section.

### Highlights stay private
Each student highlights their **own** copy of the readings in their own
Zotero library. No one else — classmates or instructor — sees their
highlights unless they share their notes.

### "Open PDF" links that work on every student's computer
Every new literature note has an **Open PDF** link at the top. In the class
syllabus, each reading's **open pdf** link opens the *student's own* copy
of that paper — something a plain Zotero link can't do, because every
student's Zotero gives the same paper a different internal ID.

### The syllabus shows each student's progress
Links to literature notes change color as the student works:

| Link looks like | Meaning |
|---|---|
| Dimmed | The literature note hasn't been made yet |
| Normal link color | Note made, nothing written yet |
| **Yellow** | Highlights synced in, nothing typed yet |
| **Green** | The student has written their own notes in it |

Colors update instantly as the student types. Filling in a note's top
section (name, course, date read) doesn't count as writing.

### A class copy of the syllabus in one command
Instructors keep one master syllabus with their own Zotero links. The
command **"Make class copy of syllabus"** produces the students' version, in
which every Zotero link is rewritten to work on the students' computers.

### Promote permanent-note candidates (unchanged)
Checking a box under **"Permanent note candidates"** creates a new
permanent note from your template and turns the line into a link to it.

### Templates update themselves
When a student's literature-note template is older than the plugin's, a
window offers to update it. Only the sections that need changing are
updated; anything else the student customized is kept, and the old version
is saved as a backup first. Notes already written are never changed.

---

## 2. What changed, version by version

| Version | Date | Changes |
|---|---|---|
| **2.0.0** | Sept 25, 2026 | Zotero import built in; highlight sync; settings carried over from Zotero Integration; plugin renamed "Second Reader" |
| **2.0.1** | Sept 25, 2026 | Removed the confusing generic "Import notes" command, which made empty notes |
| **2.0.2** | Sept 25, 2026 | Sync button added to the top of each literature note |
| **2.1.0** | Sept 25, 2026 | Plugin offers to update outdated templates; sync messages count only quotes actually added |
| **2.2.0** | Oct 4, 2026 | Progress-colored links; Open PDF links; "Make class copy of syllabus"; template updates no longer interrupt syncing unless needed |

---

## 3. Requirements

- **Obsidian on a laptop or desktop** (Mac or Windows). Second Reader does
  not run in Obsidian's phone or tablet apps.
- **Zotero 7**, open whenever you import, sync, or open a PDF, with
  *Settings → Advanced → "Allow other applications to communicate with
  Zotero"* turned on.
- **Better BibTeX** for Zotero (gives each paper its citation key).
- **BRAT**, the Obsidian plugin used to install and update Second Reader.

All of these are covered step by step in the
[setup guide](STUDENT-SETUP-GUIDE.md).

---

## 4. Installing or updating

### First-time setup
Follow the [setup guide](STUDENT-SETUP-GUIDE.md) from the top (about 30–45
minutes, once). In short: install Obsidian, Zotero, Better BibTeX, the
Zotero browser connector, and BRAT; add Second Reader through BRAT using
`kevinmil54/second-reader-obsidian-promote`; put the two templates in your
vault; and set up one import format.

### Updating from version 1 ("Second Reader: Promote Candidates")
Follow [UPDATING.md](UPDATING.md) (about 5 minutes). In short:

1. In Obsidian, Command Palette (Cmd/Ctrl+P) → **"BRAT: Add a beta plugin
   for testing"** → paste `kevinmil54/second-reader-obsidian-promote` →
   choose the **highest version number** (2.2.0 or later).
2. Quit and reopen Obsidian. Accept the **"Update your literature-note
   template?"** window.
3. Turn off the **Zotero Integration** plugin (Settings → Community
   plugins).

### Updating from version 2.0 or 2.1
BRAT updates Second Reader automatically each time Obsidian starts (if
BRAT's "Auto-update plugins at startup" setting is on). To update right
away: Command Palette → **"BRAT: Check for updates to all beta plugins and
UPDATE,"** then quit and reopen Obsidian. Accept the template window when it
appears, then get the new class syllabus from Canvas.

### How to tell you're up to date
- Settings → Community plugins → **Second Reader** shows **2.2.0** or
  higher.
- If your literature-note template is from before 2.2, Obsidian shows the
  **"Update your literature-note template?"** window right after the update.
  You can also run **"Second Reader: Update literature-note template"** at
  any time — it says "already up to date" if there's nothing to do.

If BRAT doesn't move you to the newest version, add the plugin again as in
step 1 of the version-1 instructions — that always works and keeps your
settings.

---

## 5. Using Second Reader as an instructor

### How the pieces fit
Students get two things from you each term:

1. **The readings**, as a Zotero file they import into their own Zotero
   library. Each student's copy is private to them.
2. **The syllabus**, as an Obsidian note. It links each reading to the
   student's literature note (by title) and to their own copy of the PDF.

You keep your own notes, highlights, and master syllabus in your own vault;
students never see them.

### Write the master syllabus in this pattern
For each reading, put the Zotero link and the literature-note link on the
same line:

```
1. Cai, J., & Wang, T. (2009). Conceptions of effective mathematics teaching…
   - Zotero: [open pdf](zotero://open-pdf/library/items/AFFWWLL5) · Literature note: [[Conceptions of effective mathematics teaching within a cultural context - perspectives of teachers from China and the United States]]
```

- The `zotero://` link points into **your** Zotero; it works on your
  computer, and the class copy rewrites it for students.
- The `[[...]]` link must match the name the import gives the note. With an
  output path of `Literature notes/{{title}}.md`, that's the paper's title,
  with characters a file name can't contain (like `:` and `?`) replaced —
  the same name your own import produces, so copy it from your own note.

### Each term (or whenever readings change)

**1. Export the readings from Zotero.** Right-click the course collection →
**Export Collection…** → Format: **Zotero RDF**, and set:

- ✅ **Export Files** — includes the PDFs
- ⬜ **Export Notes** — keeps your Zotero notes private
- ⬜ **Include Annotations** (if shown) — keeps your highlights out of the
  students' PDFs

Zip the exported folder and post it on Canvas. For readings added
mid-term, export just the new ones into a separate file.

**2. Make the students' syllabus.** Open your master syllabus in Obsidian
and run **"Second Reader: Make class copy of syllabus"** (Command Palette).
It creates `<syllabus name> - student copy.md` in the same folder and
reports how many links it rewrote. A Zotero link with no literature-note
link on its line is turned into plain text and listed by line number, so
you can fix the master. Post the copy on Canvas (you can rename it first).

**3. After every syllabus edit**, run the command again. It replaces the
previous student copy. Don't edit the student copy by hand — the next run
would overwrite your changes. A note at the top of the copy says so.

### What you can and can't see
- Students' highlights and notes live only on their computers. You see
  their work when they upload literature notes to Canvas, as before.
- The link colors show each student *their own* progress, in their own
  vault. They also work in your vault, coloring links to your own notes.
  (A few of your older notes, made from templates that predate the course
  repository, may show as green even if untouched; students' notes don't
  have this issue.)

### Optional: different colors
The colors are settings you can override. Create a file in your vault's
`.obsidian/snippets` folder, e.g. `second-reader-colors.css`:

```css
body.theme-light, body.theme-dark {
  --sr-lit-highlights-color: #b8860b;
  --sr-lit-worked-color: #2e7d32;
}
```

Then turn it on under Settings → Appearance → CSS snippets. You can share
the same file with students.

### Optional: test as a student would
Open the student copy in your own vault and click a few **open pdf** links.
They go through your literature notes to your own PDFs — the same path
students' links take through theirs.

---

## 6. Using Second Reader as a student

### Once per term
1. **Import the class readings into Zotero.** Download the readings file
   from Canvas, unzip it, then in Zotero: **File → Import…** → choose the
   `.rdf` file → choose **"Copy files to the Zotero storage folder"** →
   **Finish**. (Setup guide, step 3b.)
2. **Put the class syllabus in your vault.** Download the syllabus note
   from Canvas and drop it anywhere in your vault. Replace it whenever a new
   version is posted.

### For each reading

1. **Create the literature note.** Command Palette → **"Second Reader:
   Literature Note"** (named after your import format) → search for the
   reading → select it. Don't rename the note afterwards — the syllabus
   finds it by name.
2. **Open the paper** with **Open PDF** at the top of the note, or **open
   pdf** next to the reading in the syllabus. It opens in Zotero's reader.
3. **Read side by side.** Put Zotero on one half of your screen and the note
   on the other (**Mac:** hover over a window's green button → Tile Window
   to Left of Screen; **Windows:** Win + ←).
4. **Highlight and type in any order.** Highlight in **Zotero's** reader
   (not Preview or Adobe — Zotero's reader records the printed page number).
   Add a comment to a highlight when you have a reaction. Type your own
   notes in the literature note as you go.
5. **Sync whenever you like.** Click the **highlighter-pen button** at the
   top-right of the note. New highlights and comments appear under "Quotes
   worth keeping" with page numbers. Edit or trim them freely; leave the
   `^nb-…` code at the end of each quote — it's how sync knows the quote is
   already there.
6. **Promote your best ideas.** Write a short title for an idea under
   **"Permanent note candidates"** (press Enter then Tab to add a line or two
   of detail) and check its box. A permanent note is created and the line
   becomes a link to it.
7. **Upload your literature note to Canvas** if you're doing notes instead
   of a reaction paper that week.

### Reading the syllabus colors
Dimmed = note not made yet · normal = made, not started · **yellow** =
highlights synced, nothing typed · **green** = you've written in it.

### Tips
- Give sync a keyboard shortcut: Settings → Hotkeys → search "Sync
  highlights" → click **+** → press e.g. Cmd/Ctrl+Shift+S.
- To remove a quote for good, delete the highlight in Zotero too —
  otherwise the next sync brings it back.
- Wrong page numbers? In Zotero's reader, right-click a page thumbnail →
  **Rename Page…**; new syncs use the corrected numbers.

---

## 7. Troubleshooting the most common problems

| Problem | Fix |
|---|---|
| Second Reader still shows an old version after updating | Command Palette → "BRAT: Add a beta plugin for testing" → `kevinmil54/second-reader-obsidian-promote` → pick the highest version number; restart Obsidian. |
| Every Zotero command appears twice | Turn off the old **Zotero Integration** plugin. |
| An import made an empty note named like `smith2023learning` | It came from the old "Import notes" command (removed in 2.0.1). Delete it and use "Second Reader: Literature Note." |
| "open pdf" says the literature note hasn't been made | Make it with the import command — and don't rename it. |
| "open pdf" says it couldn't find a PDF | Open Zotero; check the reading has its PDF in your library (re-import the readings file if not). |
| A syllabus link stays dimmed after making the note | The note was renamed — rename it back to the title in the syllabus link. |
| Sync brings in no quotes | Zotero must be open; highlight in Zotero's reader; run "Second Reader: Update literature-note template." |
| No highlighter button at the top of a note | It only appears in literature notes made by the import command. |

Full troubleshooting tables: [setup guide](STUDENT-SETUP-GUIDE.md#troubleshooting)
and [UPDATING.md](UPDATING.md#if-somethings-not-right).

---

## 8. Known limitations

- **Laptops and desktops only** — Second Reader doesn't run in Obsidian's
  mobile apps.
- **Personal Zotero library only** — sync and "open pdf" look for papers in
  your own "My Library," not in Zotero group libraries.
- **Note names matter** — syllabus links and colors find notes by title, so
  renamed notes won't be found until their names match again.
- **Deleting a quote doesn't delete the highlight** — sync re-adds any
  highlight still in Zotero.
- **Highlights made outside Zotero's reader** may show the PDF's page count
  instead of the printed page number.
- **Readings added mid-term** need a new export from the instructor and a
  new import by students.
