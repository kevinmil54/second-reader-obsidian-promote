// Turning an instructor's syllabus into the students' copy.
//
// The instructor's `zotero://` links point at items in the instructor's own
// Zotero library, so they open nothing for students. Each is rewritten to an
// `obsidian://second-reader?open-pdf=<note>` link naming the literature note
// on the same line; the plugin resolves that, on the student's machine, to
// the student's own copy of the paper.

export const PROTOCOL_ACTION = 'second-reader';
export const OPEN_PDF_PARAM = 'open-pdf';

const ZOTERO_LINK = /\]\((zotero:\/\/[^)\s]+)\)/g;
const WIKILINK = /\[\[([^\]]+)\]\]/g;

// encodeURIComponent leaves ( ) ' ! * alone, but a ")" would end a Markdown
// link early.
function encodeParam(s: string): string {
  return encodeURIComponent(s).replace(
    /[()'!*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

export function openPdfUrl(noteLinktext: string): string {
  return `obsidian://${PROTOCOL_ACTION}?${OPEN_PDF_PARAM}=${encodeParam(noteLinktext)}`;
}

// "Title|alias" and "Title#Heading" both link to the note "Title".
export function linktextOf(wikilinkInner: string): string {
  return wikilinkInner.split('|')[0].split('#')[0].trim();
}

// The literature note a line is about: the link after "Literature note:" if
// the line has that label, otherwise the line's first note link.
function literatureNoteOnLine(line: string): string | null {
  const labelled = /Literature note:\s*\[\[([^\]]+)\]\]/i.exec(line);
  if (labelled) return linktextOf(labelled[1]);
  const first = new RegExp(WIKILINK.source).exec(line);
  return first ? linktextOf(first[1]) : null;
}

export interface ClassCopyResult {
  text: string;
  rewritten: number;
  // Literature-note links pointed at the name a student's import gives the
  // note, where that differs from the instructor's note name.
  relinked: number;
  // Lines with a Zotero link but no note link to point it at. Their Zotero
  // links are removed, since they can only ever fail for students.
  unmatchedLines: number[];
}

// Rewrites a [[link]] to the student-side note name, keeping what it
// displays: [[Instructor name]] → [[Student name|Instructor name]].
function relink(
  inner: string,
  studentNoteName: (linktext: string) => string | null
): string | null {
  const [targetAndHeading, alias] = inner.split('|');
  const [target, ...heading] = targetAndHeading.split('#');
  const name = studentNoteName(target.trim());
  if (!name || name === target.trim()) return null;
  const head = heading.length ? `#${heading.join('#')}` : '';
  return `${name}${head}|${alias ?? target.trim()}`;
}

// studentNoteName maps the instructor's note name to the name a student's
// import will give the same reading's note (null = keep the link as is).
export function makeClassCopy(
  master: string,
  masterLinktext: string,
  generatedOn: string,
  studentNoteName: (linktext: string) => string | null = () => null
): ClassCopyResult {
  let rewritten = 0;
  let relinked = 0;
  const unmatchedLines: number[] = [];
  const studentName = (linktext: string) => studentNoteName(linktext) ?? linktext;

  const lines = master.split('\n').map((line, i) => {
    if (!new RegExp(ZOTERO_LINK.source).test(line)) return line;
    const note = literatureNoteOnLine(line);
    if (!note) {
      unmatchedLines.push(i + 1);
      // Keep the link's label as plain text so the line still reads sensibly.
      return line.replace(/\[([^\]]*)\]\(zotero:\/\/[^)\s]+\)/g, '$1');
    }
    return line.replace(ZOTERO_LINK, () => {
      rewritten++;
      return `](${openPdfUrl(studentName(note))})`;
    });
  }).map((line) =>
    line.replace(WIKILINK, (whole, inner: string) => {
      const replacement = relink(inner, studentNoteName);
      if (!replacement) return whole;
      relinked++;
      return `[[${replacement}]]`;
    })
  );

  const banner =
    `%% Student copy made by Second Reader from [[${masterLinktext}]] on ${generatedOn}. ` +
    `Edit the original and run "Make class copy of syllabus" again rather than editing this copy. %%`;

  // After the frontmatter, so the copy keeps working properties.
  const text = lines.join('\n');
  const fm = /^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/.exec(text);
  const withBanner = fm
    ? text.slice(0, fm[0].length) + `\n${banner}\n` + text.slice(fm[0].length)
    : `${banner}\n\n${text}`;

  return { text: withBanner, rewritten, relinked, unmatchedLines };
}

export function classCopyPathFor(masterPath: string): string {
  return masterPath.replace(/\.md$/i, '') + ' - student copy.md';
}

export function isClassCopyPath(path: string): boolean {
  return /- student copy\.md$/i.test(path);
}
