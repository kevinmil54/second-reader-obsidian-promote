import {
  classCopyPathFor,
  isClassCopyPath,
  linktextOf,
  makeClassCopy,
  openPdfUrl,
} from '../../classCopy';

// Lines in the shape of Kevin's ED 359 syllabus.
const SYLLABUS = `---
tags: [teaching, ed359, syllabus]
---

# ED 359

*Readings:*
1. Cai, J., & Wang, T. (2009). Conceptions of effective mathematics teaching…
   - Zotero: [open pdf](zotero://open-pdf/library/items/AFFWWLL5) · Literature note: [[Conceptions of effective mathematics teaching within a cultural context - perspectives of teachers from China and the United States]]
2. Henrich et al. (2010).
   - Zotero: [open pdf](zotero://open-pdf/library/items/C3MR9668) · Literature note: [[Most people are not WEIRD]]
3. Holzer (2015).
   - Zotero: [open pdf](zotero://open-pdf/library/items/G9IB5UFQ) · Literature note: [[Everyone Has Something to Give. Living with Disability in Juchitán, Oaxaca, Mexico]]
4. Chao (1994).
   - Zotero: [open pdf](zotero://open-pdf/library/items/VBS83KS2) · Literature note: [[Beyond Parental Control (and) Authoritarian Parenting Style|Chao 1994]]
5. A reading with no note yet: [open pdf](zotero://open-pdf/library/items/ZZZZ0000)
`;

describe('makeClassCopy', () => {
  const { text, rewritten, unmatchedLines } = makeClassCopy(
    SYLLABUS,
    'Syllabus - ED 359',
    '2026-10-04'
  );

  test('every Zotero link next to a literature note is rewritten', () => {
    expect(rewritten).toBe(4);
    expect(text).not.toMatch(/zotero:\/\//);
  });

  test('links name the literature note on the same line, safely encoded', () => {
    expect(text).toContain(
      '[open pdf](obsidian://second-reader?open-pdf=Most%20people%20are%20not%20WEIRD) · Literature note: [[Most people are not WEIRD]]'
    );
    // Parentheses would otherwise end the Markdown link early; the alias is dropped.
    expect(text).toContain(
      '(obsidian://second-reader?open-pdf=Beyond%20Parental%20Control%20%28and%29%20Authoritarian%20Parenting%20Style)'
    );
    // Accented characters and periods survive a round trip.
    const holzer = /open-pdf=([^)]+)\) · Literature note: \[\[Everyone/.exec(text)![1];
    expect(decodeURIComponent(holzer)).toBe(
      'Everyone Has Something to Give. Living with Disability in Juchitán, Oaxaca, Mexico'
    );
  });

  test('a Zotero link with no note on its line becomes plain text and is reported', () => {
    expect(unmatchedLines).toEqual([16]);
    expect(text).toContain('5. A reading with no note yet: open pdf\n');
  });

  test('adds a do-not-edit banner after the frontmatter and leaves the rest alone', () => {
    expect(text.startsWith('---\ntags: [teaching, ed359, syllabus]\n---\n\n%% Student copy made by Second Reader from [[Syllabus - ED 359]] on 2026-10-04.')).toBe(true);
    expect(text).toContain('# ED 359\n\n*Readings:*');
  });
});

test('openPdfUrl and linktextOf', () => {
  expect(linktextOf('Title#Section|Alias')).toBe('Title');
  expect(openPdfUrl("It's (fine)!")).toBe(
    'obsidian://second-reader?open-pdf=It%27s%20%28fine%29%21'
  );
});

test('class copy paths', () => {
  expect(classCopyPathFor('Classes/ED 359/Syllabus.md')).toBe(
    'Classes/ED 359/Syllabus - student copy.md'
  );
  expect(isClassCopyPath('Classes/ED 359/Syllabus - student copy.md')).toBe(true);
  expect(isClassCopyPath('Classes/ED 359/Syllabus.md')).toBe(false);
});

describe('makeClassCopy with student-side note names', () => {
  const studentNames: Record<string, string> = {
    'Most people are not WEIRD': 'Most people are not WEIRD.',
    'The Developmental Niche':
      'The Developmental Niche - A Conceptualization at the Interface of Child and Culture',
  };
  const { text, relinked } = makeClassCopy(
    SYLLABUS + '6. Super & Harkness (1986).\n   - Zotero: [open pdf](zotero://open-pdf/library/items/VARHWK8Q) · Literature note: [[The Developmental Niche]]\n',
    'Syllabus',
    '2026-10-04',
    (linktext) => studentNames[linktext] ?? null
  );

  test('links whose student-side name differs point there but read the same', () => {
    expect(text).toContain('Literature note: [[Most people are not WEIRD.|Most people are not WEIRD]]');
    expect(text).toContain(
      'Literature note: [[The Developmental Niche - A Conceptualization at the Interface of Child and Culture|The Developmental Niche]]'
    );
    expect(relinked).toBe(2);
  });

  test('"open pdf" uses the student-side name', () => {
    expect(text).toContain('(obsidian://second-reader?open-pdf=Most%20people%20are%20not%20WEIRD.)');
    expect(text).toContain('open-pdf=The%20Developmental%20Niche%20-%20A%20Conceptualization');
  });

  test('links that already match are left exactly as they were', () => {
    expect(text).toContain('Literature note: [[Conceptions of effective mathematics teaching within a cultural context - perspectives of teachers from China and the United States]]');
  });
});
