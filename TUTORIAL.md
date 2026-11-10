# Second Reader: a tutorial

This walks through what the plugin does, in the order you'd use it, and what is happening underneath each step. It's written for you as the author and instructor. For what students see, read `STUDENT-SETUP-GUIDE.md`.

## 1. The idea

Second Reader supports a note-taking workflow with four kinds of notes:

```
Literature note → Permanent notes → Synthesis note
                                  ↘ Project note
```

- A **literature note** holds your notes on one reading, plus its quotes.
- A **permanent note** holds one idea, in your own words.
- A **synthesis note** gathers the permanent notes on one topic.
- A **project note** is the argument framework for something you're writing.

The plugin automates the mechanical steps between these. It does not do the thinking. It creates notes, syncs quotes, and keeps lists. It never rewrites what you or a student typed.

## 2. What it connects to

- **Zotero 7** with the **Better BibTeX** plugin, and Zotero's "Allow other applications to communicate with Zotero" setting on. The plugin asks Better BibTeX for citations and items over `http://127.0.0.1:23119`. Nothing leaves your computer for this.
- **pdfannots2json**, a small program that reads highlights out of a PDF. Second Reader downloads it once (Settings → Second Reader → PDF Utility), checks it against a built-in SHA-256 checksum, and stores it in the plugin's own folder. It's optional. Highlights made in Zotero's own reader don't need it; reading annotations out of PDF files does.
- **Desktop only.** Mobile Obsidian can't talk to Zotero or run the helper.

## 3. Importing a paper

1. In Obsidian, open the command palette and run the command named after your import format (by default **Literature Note**). It opens a Zotero picker where you choose the items. **Insert notes into current document** does the same but inserts into the open note.
2. The plugin asks Better BibTeX for the item's data and renders it through a **Nunjucks template** (`Templates/Literature Note Template - Zotero Import.md`).
3. The result is a note with title, authors, citekey, an APA reference and an "Open PDF · Open in Zotero" line.

Under the hood, the *Import Format* in settings decides the template, the output path (for example `Literature notes/{{title}}.md`), and the image settings. Import formats were copied from the Zotero Integration plugin the first time you ran 2.x.

An import never overwrites an existing note. That is what makes it safe to re-run.

## 4. Syncing highlights while you read

This is the centerpiece.

1. Open the PDF in Zotero's reader and the literature note in Obsidian, side by side.
2. Highlight and comment in Zotero.
3. Click the **highlighter button** at the top right of the note (also in the left ribbon), or run **Sync highlights into current note**.
4. New highlights appear under **Quotes worth keeping**, each with its **printed page number**. The plugin uses Zotero's page label, then falls back to the PDF page.

How it avoids clobbering your typing:

- Quotes live only inside a plugin-owned block: `%% begin annotations %% … %% end annotations %%`. Sync touches only that block.
- If the note is open, the edit goes through the **live editor**, so your cursor, undo history and unsaved keystrokes survive.
- Each quote gets a block id from Zotero's annotation key, like `^nb-ABCD1234`. A highlight is added only if its id isn't already anywhere in the note. So if you trim, edit or move a quote, it won't come back as a duplicate. You can also link to one: `[[smith2023#^nb-ABCD1234]]`.

**Figures and tables:** draw a box with Zotero's select-area tool, then sync. The image lands in the note with its page number.

## 5. Promoting ideas to permanent notes

1. In a literature note tagged `literature-note`, write candidates under `## Permanent note candidates`, as checklist lines.
2. Tick a box. The plugin watches literature notes and promotes it automatically. **Promote checked candidates in this note** is a manual catch-up if a tick is missed.
3. A permanent note is created from `Permanent Note Template.md`, and the line becomes a link to it.

The template fills in `{{title}}`, `{{date}}`, `{{source}}`, `{{tags}}`, `{{topics}}` and `{{details}}`. `{{topics}}` comes from the literature note's `topics:` property, so a paper's topics become the starting topics of each note promoted from it.

## 6. Synthesis notes

Once you have enough permanent notes on one topic (default 4), the plugin creates a **synthesis note** for that topic in `Synthesis notes/` and keeps one list in it: the permanent notes on that topic **that you haven't linked yet**.

- Permanent notes are tagged `permanent-note`; their topics are the `topics:` property.
- The list sits between `%% begin synthesis-notes %%` and `%% end synthesis-notes %%`. Everything outside it is yours.
- As you cite a permanent note in your writing, it drops off the list.
- **Cite a permanent note here** opens a search box of unlinked notes. It inserts a link at the cursor, using your selection as the link text if you have one. Give it a hotkey.
- **Create synthesis notes for topics with enough permanent notes** catches older topics.

Project notes (`type: project`) work the same way with **Cite a permanent note here**, showing all permanent notes, with the ones sharing a topic with the project's `synthesis:` notes first.

## 7. For instructors: running a class

1. **Export readings from Zotero** as Zotero RDF, with files, without notes, without annotations. Students import it into their own Zotero.
2. **Make the class copy of your syllabus:** run **Make class copy of syllabus** on your master. It writes `<name> - student copy.md` with your personal `zotero://` links rewritten to `obsidian://second-reader?open-pdf=<literature note title>`. On a student's machine that opens *their* copy of the PDF through *their* literature note. Re-run it after every syllabus edit.
3. **Progress colors:** links to literature notes turn different colors as a student works. Untouched, highlights synced, worked. Override with `--sr-lit-highlights-color` and `--sr-lit-worked-color`.
4. **Weekly upload:** a link under each `Week N` heading zips that week's literature notes, with the student's name in the file name. It saves to `Uploads/` and shows it in Finder or Explorer, ready for Canvas.
5. **Mid-term fixes:** give students a folder of new or revised notes. **Bring in course update** adds new notes, replaces blank ones, and leaves anything a student has written in.
6. **Housekeeping commands:** **Fill in Zotero links in literature notes**, **Name literature notes by title**, and **Update literature-note template** (which backs up the old file first).

## 8. Where things live in the code

| Area | File |
|---|---|
| Plugin entry, commands, ribbon | `src/main.ts` |
| Zotero requests (Better BibTeX) | `src/bbt/jsonRPC.ts` |
| Note rendering and merge | `src/bbt/export.ts` |
| Highlight sync | `src/bbt/sync.ts` |
| Template engine | `src/bbt/template.env.ts` |
| Promote | `src/promote.ts` |
| Synthesis | `src/synthesisCore.ts` (logic), `src/synthesis.ts` (vault) |
| Link colors | `src/litNoteState.ts` |
| PDF utility download and checksum | `src/pdfUtilityIntegrity.ts` |
| Settings (Obsidian 1.13+ declarative API) | `src/settings/settings.tsx` |

## 9. Releasing

Bump `version` in `manifest.json` and `package.json`, add it to `versions.json`, merge, then push a tag matching the version, with no `v`: `git tag 2.12.4 && git push origin 2.12.4`. The workflow builds `main.js`, attaches the assets and attests them. Then click **Check for new releases** on your plugin page, and the directory reviews that release.

When changing `Templates/Literature Note Template - Zotero Import.md`, first append the outgoing version to `src/pastLiteratureTemplates.md` followed by `<<<SECOND-READER-TEMPLATE-VERSION>>>`. That is how link colors recognize template text in older notes.

## 10. What the review notices mean

The directory's behavior notices (filesystem, shell, clipboard, dynamic code, vault enumeration) come from what the plugin does:

- **Filesystem:** reads Zotero's storage folder and writes the PDF utility and zips.
- **Shell:** runs `pdfannots2json` (and Tesseract if enabled) with no shell involved.
- **Dynamic code:** Nunjucks templates compile to functions.
- **Vault enumeration:** link colors, synthesis and course updates need to scan notes.
- **Clipboard:** the Data explorer's copy buttons, which copy template variable names.

They're disclosed in the README under "Network use and access outside your vault".
