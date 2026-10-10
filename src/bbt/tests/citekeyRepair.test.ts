import { normTitle, pickCitekey, replaceCitekey } from '../../citekeyRepair';

const item = (citekey: string, title: string, year?: number) => ({
  citekey,
  title,
  ...(year ? { issued: { 'date-parts': [[year]] } } : {}),
});

describe('pickCitekey', () => {
  test('matches the title regardless of punctuation, case and tags', () => {
    expect(normTitle('Orthography and the Development of Reading Processes: An Eye‐Movement Study')).toBe(
      normTitle('orthography and the development of reading processes - an eye-movement study')
    );
    expect(
      pickCitekey([item('fengOrth2009b', 'Orthography <i>and</i> the Development')], 'Orthography and the development')
    ).toBe('fengOrth2009b');
  });
  test('ignores items whose title only contains the search words', () => {
    expect(pickCitekey([item('a', 'Introduction to statistics')], 'Introduction')).toBeNull();
  });
  test('uses the year to choose between items with the same title', () => {
    const r = [item('tobin1989', 'Introduction', 1989), item('smith2001', 'Introduction', 2001)];
    expect(pickCitekey(r, 'Introduction', '1989')).toBe('tobin1989');
    expect(pickCitekey(r, 'Introduction')).toBeNull();
  });
  test('the same item listed twice still counts as one match', () => {
    const r = [item('k', 'Most people are not WEIRD', 2010), item('k', 'Most people are not WEIRD', 2010)];
    expect(pickCitekey(r, 'Most people are not WEIRD', '2010')).toBe('k');
  });
  test('a title that gained or lost its ending still matches, if only one item does', () => {
    const r = [item('bm', 'Could AI chatbots undo the harms of social media?: Opinion Data Points')];
    expect(pickCitekey(r, 'Could AI chatbots undo the harms of social media?')).toBe('bm');
    expect(pickCitekey([item('x', 'Could AI chatbots undo the harms of social media?')], 'Could AI chatbots undo the harms of social media?: Opinion')).toBe('x');
    const two = [item('a', 'Could AI chatbots undo the harms of social media? Part 1'), item('b', 'Could AI chatbots undo the harms of social media? Part 2')];
    expect(pickCitekey(two, 'Could AI chatbots undo the harms of social media?')).toBeNull();
  });
  test('a short shared start is not enough', () => {
    expect(pickCitekey([item('a', 'Introduction to the volume')], 'Introduction')).toBeNull();
  });
  test('an exact match wins over a longer title', () => {
    const r = [item('long', 'Most people are not WEIRD: a reply'), item('exact', 'Most people are not WEIRD')];
    expect(pickCitekey(r, 'Most people are not WEIRD')).toBe('exact');
  });
  test('no results or no citekey gives null', () => {
    expect(pickCitekey([], 'x')).toBeNull();
    expect(pickCitekey([item('', 'x')], 'x')).toBeNull();
  });
});

describe('replaceCitekey', () => {
  const note = `---
citekey: feng2009
zotero: zotero://select/items/@feng2009
---
> [Open in Zotero](zotero://select/items/@feng2009) · **Cite:** [@feng2009] and [@feng2009a]
`;
  test('swaps the property, links and citations, and nothing longer', () => {
    const out = replaceCitekey(note, 'feng2009', 'fengOrth2009');
    expect(out).toContain('citekey: fengOrth2009\n');
    expect(out).toContain('zotero://select/items/@fengOrth2009\n');
    expect(out).toContain('[@fengOrth2009] and [@feng2009a]');
    expect(out).not.toMatch(/@feng2009(?![a-zA-Z0-9])/);
  });
});
