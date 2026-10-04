// Bringing a student's literature-note template up to date with the one
// bundled in the plugin. Each upgrade patches only the part of the template
// it needs, so anything a student customized elsewhere survives:
//   - the "Quotes worth keeping" section (highlight import)
//   - the `pdf:` frontmatter line and the "Open PDF" link (opening the
//     student's own copy of the paper from the syllabus)

const QUOTES_HEADING = /^##\s+Quotes worth keeping[ \t]*$/im;
const NEXT_SECTION = /^#{1,2}\s/m;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;
const OPEN_IN_ZOTERO = '[Open in Zotero](';

export function hasHighlightImport(template: string): boolean {
  return template.includes('newAnnotations');
}

export function hasPdfLink(template: string): boolean {
  return template.includes('pdfURI');
}

// From the Quotes heading up to (not including) the next level-1/2 heading.
function quotesSection(text: string): { start: number; end: number } | null {
  const h = QUOTES_HEADING.exec(text);
  if (!h) return null;
  const afterHeading = h.index + h[0].length;
  const next = NEXT_SECTION.exec(text.slice(afterHeading));
  return {
    start: h.index,
    end: next ? afterHeading + next.index : text.length,
  };
}

function patchQuotes(current: string, bundled: string): string {
  if (hasHighlightImport(current)) return current;
  const cur = quotesSection(current);
  const neu = quotesSection(bundled);
  if (!cur || !neu) return current;
  return (
    current.slice(0, cur.start) +
    bundled.slice(neu.start, neu.end) +
    current.slice(cur.end)
  );
}

function patchPdfLink(current: string, bundled: string): string {
  if (hasPdfLink(current)) return current;
  const pdfLine = bundled.split(/\r?\n/).find((l) => /^pdf:/.test(l));
  const fm = FRONTMATTER.exec(current);
  if (!pdfLine || !fm) return current;

  // The pdf: line also defines `pdfAtt` for the Open PDF link below, so it
  // goes in the frontmatter, after zotero: when there is one.
  const lines = fm[1].split(/\r?\n/);
  const zoteroAt = lines.findIndex((l) => /^zotero:/.test(l));
  lines.splice(zoteroAt >= 0 ? zoteroAt + 1 : lines.length, 0, pdfLine);
  let out =
    current.slice(0, fm.index) +
    `---\n${lines.join('\n')}\n---${fm[2]}` +
    current.slice(fm.index + fm[0].length);

  const openPdf = bundled.match(/\{% if pdfAtt %\}.*?\{% endif %\}/);
  if (openPdf && out.includes(OPEN_IN_ZOTERO)) {
    out = out.replace(OPEN_IN_ZOTERO, openPdf[0] + OPEN_IN_ZOTERO);
  }
  return out;
}

// Returns the upgraded template, or null when there's nothing to do: it's
// already current, or it isn't a Second Reader literature-note template (no
// Quotes section) and so isn't ours to rewrite.
export function upgradeTemplateText(
  current: string,
  bundled: string
): string | null {
  if (!QUOTES_HEADING.test(current)) return null;
  const upgraded = patchPdfLink(patchQuotes(current, bundled), bundled);
  return upgraded === current ? null : upgraded;
}

export function backupPathFor(path: string, exists: (p: string) => boolean) {
  const stem = path.replace(/\.md$/i, '');
  let candidate = `${stem} (before Second Reader update).md`;
  for (let n = 2; exists(candidate); n++) {
    candidate = `${stem} (before Second Reader update, ${n}).md`;
  }
  return candidate;
}
