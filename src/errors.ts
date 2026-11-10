// The text of anything that was thrown. Errors from Obsidian, Zotero and Node
// are Error objects, but a catch clause can receive any value.
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return String(e);
}
