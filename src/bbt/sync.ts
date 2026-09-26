// Second Reader: merge freshly rendered import output into an existing note
// without touching anything the student wrote.
//
// Only `%% begin <id> %% ... %% end <id> %%` persist blocks are plugin-owned.
// A sync replaces each block that exists in both the note and the new render;
// every other character of the note is left exactly as it was.

const PERSIST_BLOCK = /%% begin (.+?) %%([\w\W]*?)%% end \1 %%/gi;
const IMPORT_DATE = /%% Import Date: \S+ %%(?=\n?$)/;

export interface BlockRange {
  id: string;
  start: number;
  end: number;
  text: string;
}

export function findPersistBlocks(md: string): BlockRange[] {
  const blocks: BlockRange[] = [];
  for (const m of md.matchAll(PERSIST_BLOCK)) {
    blocks.push({
      id: m[1],
      start: m.index,
      end: m.index + m[0].length,
      text: m[0],
    });
  }
  return blocks;
}

export interface BlockEdit {
  start: number;
  end: number;
  text: string;
}

export interface SyncPlan {
  edits: BlockEdit[];
  // Persist blocks present in the render but missing from the note (e.g. a
  // student deleted the markers). These are re-inserted, never dropped.
  missing: string[];
}

const QUOTES_HEADING = /^##\s+Quotes worth keeping\s*$/im;

// Where to re-insert a missing block: after the Quotes heading and its
// instruction paragraph for the annotations block, else at the end.
function insertionPoint(current: string, id: string): number {
  if (id === 'annotations') {
    const h = QUOTES_HEADING.exec(current);
    if (h) {
      let pos = h.index + h[0].length;
      const rest = current.slice(pos);
      const para = /^\n+[^\n#][^\n]*(?:\n[^\n#][^\n]*)*/.exec(rest);
      if (para) pos += para[0].length;
      return pos;
    }
  }
  return current.length;
}

// Edits are returned last-to-first so they can be applied in order without
// shifting earlier offsets.
export function planSync(current: string, rendered: string): SyncPlan {
  const renderedBlocks = new Map(
    findPersistBlocks(rendered).map((b) => [b.id, b.text])
  );
  const edits: BlockEdit[] = [];
  const seen = new Set<string>();

  for (const block of findPersistBlocks(current)) {
    seen.add(block.id);
    const replacement = renderedBlocks.get(block.id);
    if (replacement !== undefined && replacement !== block.text) {
      edits.push({ start: block.start, end: block.end, text: replacement });
    }
  }

  const missing = [...renderedBlocks.keys()].filter((id) => !seen.has(id));
  for (const id of missing) {
    const pos = insertionPoint(current, id);
    edits.push({ start: pos, end: pos, text: `\n\n${renderedBlocks.get(id)}` });
  }

  // The trailing import-date marker is plugin metadata; older templates filter
  // highlights by it, so keep it current or they'd re-append old quotes.
  const newDate = IMPORT_DATE.exec(rendered);
  const oldDate = IMPORT_DATE.exec(current);
  if (newDate && oldDate && newDate[0] !== oldDate[0]) {
    edits.push({
      start: oldDate.index,
      end: oldDate.index + oldDate[0].length,
      text: newDate[0],
    });
  }

  edits.sort((a, b) => b.start - a.start);
  return { edits, missing };
}

function innerOf(block: string, id: string): string {
  return block.slice(
    `%% begin ${id} %%`.length,
    block.length - `%% end ${id} %%`.length
  );
}

// A render is computed from a snapshot of the note, but the student may keep
// typing while Zotero is queried. The persist extension renders each block as
// `snapshotInner + newContent`, so peel off the new content and re-apply it on
// top of the note as it is *now*, instead of reverting the block to the
// snapshot.
export function rebaseRendered(
  snapshot: string,
  current: string,
  rendered: string
): string {
  const snap = new Map(findPersistBlocks(snapshot).map((b) => [b.id, b.text]));
  const now = new Map(findPersistBlocks(current).map((b) => [b.id, b.text]));

  return rendered.replace(PERSIST_BLOCK, (whole, id: string) => {
    const s = snap.get(id);
    const c = now.get(id);
    if (s === undefined || c === undefined || s === c) return whole;
    const renderedInner = innerOf(whole, id);
    const snapInner = innerOf(s, id);
    if (!renderedInner.startsWith(snapInner)) return whole;
    const added = renderedInner.slice(snapInner.length);
    return `%% begin ${id} %%${innerOf(c, id)}${added}%% end ${id} %%`;
  });
}

export function applySync(current: string, plan: SyncPlan): string {
  let out = current;
  for (const e of plan.edits) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}

// Stable, Obsidian-block-id-safe identifier for an annotation. Zotero-native
// annotations have an 8-character key; PDF-extracted ones may not, so fall
// back to a hash of page + text so repeated syncs stay idempotent.
export function annotationSyncId(annot: any): string {
  const raw = annot?.id != null ? String(annot.id) : '';
  const cleaned = raw.replace(/[^A-Za-z0-9-]/g, '');
  if (cleaned) return cleaned;

  const basis = `${annot?.pageLabel ?? annot?.page ?? ''}|${
    annot?.annotatedText ?? annot?.imageBaseName ?? ''
  }|${annot?.comment ?? ''}`;
  let h = 5381;
  for (let i = 0; i < basis.length; i++) {
    h = ((h << 5) + h + basis.charCodeAt(i)) | 0;
  }
  return 'h' + (h >>> 0).toString(36);
}

// Quotes added by a sync, counted from the note itself rather than from what
// Zotero reported, so the count is right even if the template didn't render
// some annotations.
export function countAddedQuotes(before: string, after: string): number {
  const ids = (s: string) => new Set(s.match(/\^nb-[A-Za-z0-9-]+/g) ?? []);
  const had = ids(before);
  let added = 0;
  for (const id of ids(after)) if (!had.has(id)) added++;
  return added;
}

export function blockIdFor(annot: any): string {
  return `nb-${annotationSyncId(annot)}`;
}

// Annotations whose block id doesn't yet appear anywhere in the note. Checking
// the whole note (not just the quotes block) means a quote a student moved
// into another section still counts as synced.
export function unsyncedAnnotations(annotations: any[], noteText: string) {
  if (!noteText) return annotations;
  return annotations.filter(
    (a) => !noteText.includes(`^${blockIdFor(a)}`)
  );
}
