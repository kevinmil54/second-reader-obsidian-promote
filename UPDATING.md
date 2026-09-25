# Updating to Second Reader 2

**Who this is for:** you already set up Second Reader earlier this term —
you have the **"Second Reader: Promote Candidates"** plugin and the
**"Zotero Integration"** plugin in Obsidian. (Setting up for the first time?
Use [STUDENT-SETUP-GUIDE.md](STUDENT-SETUP-GUIDE.md) instead.)

**What's new:** Second Reader is now one plugin that does everything —
importing papers from Zotero, promoting permanent-note candidates, and a
new feature: **your Zotero highlights and comments flow into your
literature note as quotes, with page numbers**. You can read in Zotero with
your note open beside it, type notes and highlight at the same time, and
click one button to bring your highlights in. Nothing you've typed is ever
changed.

**Time needed:** about 10 minutes. Works the same on Mac and Windows except
where noted.

**Before you start:** make sure the **Zotero** app is open.

---

## Step 1. Update the plugin

1. In Obsidian, open the Command Palette: **Cmd+P** (Mac) or **Ctrl+P**
   (Windows).
2. Type **BRAT: Add a beta plugin for testing** and press Enter.
3. Paste this and press Enter (or click "Add plugin"):

   ```
   kevinmil54/second-reader-obsidian-promote
   ```

4. When it asks for a version, choose the **highest number in the list**
   (**2.0.2** or higher) — not "Latest version."
5. Wait for the message saying the plugin was installed or updated.

> **Why not just "Check for updates"?** For some students, BRAT isn't
> tracking Second Reader (it depends on how it was first installed), so a
> plain update check silently skips it. Adding it again as above always
> works, and it keeps all your settings.

## Step 2. Quit and reopen Obsidian

Fully quit — don't just close the note:

- **Mac:** press **Cmd+Q** while Obsidian is in front.
- **Windows:** close every Obsidian window.

Then open Obsidian again. Within a few seconds you should see a message:
**"Second Reader copied your import format and other Zotero settings from
the Zotero Integration plugin."** That means your import setup carried over
and you don't need to redo it. (If you don't see it, it's usually fine —
Step 6 will tell you.)

## Step 3. Turn off Zotero Integration

Second Reader now includes everything Zotero Integration did. Leaving both
on gives you two copies of every command.

1. Settings (the gear icon, bottom-left) → **Community plugins**.
2. Find **Zotero Integration** and switch it **off**.
3. While you're there, check that **Second Reader** is switched **on** and
   shows version **2.0.2** or higher. (Its name is now just "Second Reader"
   — "Promote Candidates" is gone from the name.)

Until you turn Zotero Integration off, Second Reader shows a reminder each
time Obsidian starts.

## Step 4. Replace your literature-note template

The highlight import needs the new version of **one** template. (Your
Permanent Note Template hasn't changed — leave it alone.)

1. Open this page in your web browser:
   **[Literature Note Template - Zotero Import.md](https://github.com/kevinmil54/second-reader-obsidian-promote/blob/main/Templates/Literature%20Note%20Template%20-%20Zotero%20Import.md)**
2. Click the **Download raw file** button (a download-arrow icon near the
   top-right of the file).
3. Move the downloaded file into your vault's **Templates** folder,
   **replacing** the old file with the same name:
   - **Mac:** drag it from Downloads into the Templates folder in Finder;
     when asked, click **Replace**.
   - **Windows:** drag it from Downloads into the Templates folder in File
     Explorer; when asked, choose **Replace the file in the destination**.

   Not sure where your vault is on your computer? In Obsidian, right-click
   the **Templates** folder in the left sidebar → **Reveal in Finder**
   (Mac) or **Show in system explorer** (Windows).
4. Make sure the file name is still exactly
   `Literature Note Template - Zotero Import.md` — some browsers add
   ` (1)` or `.txt` to downloaded files. Rename it if needed.

## Step 5. Learn where the sync button is

Open any literature note. At the **top-right corner of the note**, next to
the `⋮` button, you'll now see a small **highlighter-pen icon**. Hover over
it and it says **"Sync Zotero highlights into this note."** That's the
button you'll click to bring your Zotero highlights in.

(The same button is also in the ribbon — the strip of icons along the
far-left edge of Obsidian — and in the Command Palette as **"Second
Reader: Sync highlights into current note."**)

## Step 6. Try it on a paper you've already started

1. In Zotero, open a paper that already has a literature note, and
   highlight a sentence or two (in Zotero's own PDF reader — double-click
   the PDF in Zotero).
2. In Obsidian, open that paper's literature note.
3. Click the **highlighter-pen icon** at the top-right of the note.

Your highlights appear under **"Quotes worth keeping,"** each with its page
number. For notes you made before updating, Second Reader adds the quotes
area under that heading the first time — you may see a message saying the
quotes block "was missing" and was added. That's expected, and nothing else
in your note changes.

**You're done.** From now on, see "Reading a paper: notes and highlights
together" in [STUDENT-SETUP-GUIDE.md](STUDENT-SETUP-GUIDE.md) for the new
reading routine.

---

## What changed in how you work

- **Creating a note:** your import command has a new name. It used to be
  **"Zotero Integration: *your format name*"**; it's now **"Second Reader:
  *your format name*"** — for example "Second Reader: Literature Note."
  Everything else about importing is the same.
- **"Import notes" is gone.** The old generic "Import notes" command made
  empty notes named after the paper's citekey (like `smith2023learning`).
  If you have any of those, delete them.
- **Highlights:** highlight in Zotero, click the sync button in your note.
  Sync as often as you like — each highlight comes in once, and you can
  edit, trim, or move imported quotes without them coming back.
- **Promoting permanent notes** works exactly as before.

---

## If something's not right

| What you see | What to do |
|---|---|
| Second Reader still shows version 1.x | Repeat Step 1 and make sure you pick the highest version number, then Step 2. |
| Your import command isn't in the Command Palette | Type **Second Reader** in the Command Palette to see its commands. If none are named after your import format, your format didn't carry over: set it up again with step 4f in [STUDENT-SETUP-GUIDE.md](STUDENT-SETUP-GUIDE.md). |
| Every Zotero command appears twice | Zotero Integration is still on — Step 3. |
| No highlighter icon at the top-right of the note | That icon only appears in literature notes made by the import command (they have a `citekey:` line at the top). Also check Second Reader is version 2.0.2 or higher. |
| Clicking sync brings in no quotes | Check that Zotero is open, that you highlighted in **Zotero's** reader (not Preview or Adobe), and that you replaced the template in Step 4. |
| A message says the note "has no citekey in its frontmatter" | The note wasn't created by the import command. Sync only works in notes that have a `citekey:` line at the top. |
| Page numbers look wrong | In Zotero's reader, right-click a page in the thumbnails sidebar → **Rename Page…** to fix the numbering, then sync again for new highlights. |

Still stuck? Tell your instructor what you see (a screenshot helps).
