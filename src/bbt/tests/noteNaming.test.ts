import {
  isCitekeyNamed,
  nameNotesByTitle,
  namesNotesByCitekey,
  titleNamedPath,
} from '../../noteNaming';

test('detects import formats that name notes by citekey', () => {
  expect(namesNotesByCitekey('Literature notes/{{citekey}}.md')).toBe(true);
  expect(namesNotesByCitekey('{{citekey}}.md')).toBe(true);
  expect(namesNotesByCitekey('Literature notes/{{title}}.md')).toBe(false);
  // A folder named by citekey doesn't count; only the note's own name.
  expect(namesNotesByCitekey('Papers/{{citekey}}/{{title}}.md')).toBe(false);
});

test('switches only the note name to the title', () => {
  expect(nameNotesByTitle('Literature notes/{{citekey}}.md')).toBe('Literature notes/{{title}}.md');
  expect(nameNotesByTitle('{{ citekey }}.md')).toBe('{{title}}.md');
});

test('only notes named exactly by their citekey are renamed', () => {
  expect(isCitekeyNamed('cai2009', 'cai2009')).toBe(true);
  expect(isCitekeyNamed('@cai2009', 'cai2009')).toBe(true);
  expect(isCitekeyNamed('My notes on Cai', 'cai2009')).toBe(false);
  expect(isCitekeyNamed('cai2009', '')).toBe(false);
});

test('title-based names match what the import produces (see the ED 359 syllabus links)', () => {
  expect(
    titleNamedPath(
      'Literature notes/cai2009.md',
      'Conceptions of effective mathematics teaching within a cultural context: perspectives of teachers from China and the United States'
    )
  ).toBe(
    'Literature notes/Conceptions of effective mathematics teaching within a cultural context - perspectives of teachers from China and the United States.md'
  );
  expect(
    titleNamedPath(
      'Literature notes/critical1997.md',
      'Critical Issues Literacy Connections between School and Home: How Should We Evaluate Them?'
    )
  ).toBe('Literature notes/Critical Issues Literacy Connections between School and Home - How Should We Evaluate Them.md');
  expect(titleNamedPath('henrich2010.md', 'Most people are not WEIRD')).toBe('Most people are not WEIRD.md');
});
