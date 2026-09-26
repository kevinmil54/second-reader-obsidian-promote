// Upgrading a student's literature-note template to one that can import
// Zotero highlights. Only the "Quotes worth keeping" section is replaced, so
// anything a student customized elsewhere in their template survives.

const QUOTES_HEADING = /^##\s+Quotes worth keeping[ \t]*$/im;
const NEXT_SECTION = /^#{1,2}\s/m;

export function hasHighlightImport(template: string): boolean {
  return template.includes('newAnnotations');
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

// Returns the upgraded template, or null when there's nothing to do: it can
// already import highlights, or it isn't a Second Reader literature-note
// template (no Quotes section) and so isn't ours to rewrite.
export function upgradeTemplateText(
  current: string,
  bundled: string
): string | null {
  if (hasHighlightImport(current)) return null;
  const cur = quotesSection(current);
  const neu = quotesSection(bundled);
  if (!cur || !neu) return null;
  return (
    current.slice(0, cur.start) +
    bundled.slice(neu.start, neu.end) +
    current.slice(cur.end)
  );
}

export function backupPathFor(path: string, exists: (p: string) => boolean) {
  const stem = path.replace(/\.md$/i, '');
  let candidate = `${stem} (before Second Reader 2).md`;
  for (let n = 2; exists(candidate); n++) {
    candidate = `${stem} (before Second Reader 2, ${n}).md`;
  }
  return candidate;
}
