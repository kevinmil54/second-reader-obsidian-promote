// Literature notes handed out with a course vault carry the citekey each
// reading had in the instructor's library. A student's Zotero normally keeps
// that key when the readings are imported, but if it made its own key, the
// note can't find its item. These helpers find the student's item by title
// (and year) and swap the note over to the student's key.

// Lower-case letters and digits only, so punctuation, dashes, curly quotes
// and HTML tags in titles don't stop a match.
export function normTitle(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function yearOf(item: any): string {
  const parts = item?.issued?.['date-parts']?.[0];
  return parts?.[0] ? String(parts[0]) : '';
}

// The citekey of the one search result whose title matches, preferring the
// one from the same year when several do. null when there is no single match.
export function pickCitekey(results: any[], title: string, year?: string): string | null {
  const want = normTitle(title);
  if (!want) return null;
  const same = (results ?? []).filter(
    (r) => typeof r?.citekey === 'string' && r.citekey && normTitle(String(r.title ?? '')) === want
  );
  if (same.length === 1) return same[0].citekey;
  const sameYear = year ? same.filter((r) => yearOf(r) === String(year).trim()) : [];
  const keys = new Set(sameYear.map((r) => r.citekey));
  return keys.size === 1 ? [...keys][0] : null;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Swaps every use of the old key in the note: the citekey property, [@key]
// citations and zotero://select/items/@key links. A longer key that merely
// starts with the old one is left alone.
export function replaceCitekey(text: string, oldKey: string, newKey: string): string {
  const old = escapeRegExp(oldKey.replace(/^@/, ''));
  return text
    .replace(new RegExp(`^(citekey:\\s*)@?${old}\\s*$`, 'm'), `$1${newKey}`)
    .replace(new RegExp(`@${old}(?![A-Za-z0-9_:-])`, 'g'), `@${newKey}`);
}
