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

function chooseOne(items: any[], year?: string): string | null {
  const keys = new Set(items.map((r) => r.citekey));
  if (keys.size === 1) return [...keys][0];
  const sameYear = year ? items.filter((r) => yearOf(r) === String(year).trim()) : [];
  const yearKeys = new Set(sameYear.map((r) => r.citekey));
  return yearKeys.size === 1 ? [...yearKeys][0] : null;
}

// The citekey of the one search result whose title matches, preferring the
// one from the same year when several do. Failing an exact match, a title
// that only adds to or drops the end of the other (a subtitle, say) counts,
// as long as just one item matches that way. null when there is no single
// match.
export function pickCitekey(results: any[], title: string, year?: string): string | null {
  const want = normTitle(title);
  if (!want) return null;
  const withKey = (results ?? []).filter((r) => typeof r?.citekey === 'string' && r.citekey);
  const exact = withKey.filter((r) => normTitle(String(r.title ?? '')) === want);
  if (exact.length) return chooseOne(exact, year);
  const MIN = 20; // a shared start shorter than this is too weak to trust
  const prefix = withKey.filter((r) => {
    const got = normTitle(String(r.title ?? ''));
    const shorter = got.length < want.length ? got : want;
    return shorter.length >= MIN && (got.startsWith(want) || want.startsWith(got));
  });
  return prefix.length ? chooseOne(prefix, year) : null;
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
