import { buildBoilerplate, literatureNoteState } from '../../litNoteState';

// An instructor's template can add lines the bundled one doesn't have. Those
// lines must count as template text, or every blank note looks "worked".
const BUNDLED = `---
title: "{{title}}"
---

# {{title}}

## Why I'm reading this

- 
`;
const VAULT = BUNDLED.replace(
  '## Why',
  '**How I read it** (check one)\n- [ ] Read in full\n- [ ] Read partially\n\n## Why'
);
const NOTE = `---
title: "A paper"
---

# A paper

**How I read it** (check one)
- [ ] Read in full
- [ ] Read partially

## Why I'm reading this

- 
`;

describe('blank notes made from a vault template', () => {
  test('look worked when only the bundled template is known', () => {
    expect(literatureNoteState(NOTE, buildBoilerplate([BUNDLED]))).toBe('worked');
  });
  test('are untouched once the vault template is known', () => {
    expect(literatureNoteState(NOTE, buildBoilerplate([BUNDLED, VAULT]))).toBe('untouched');
  });
  test('checking a box or writing a line counts as work', () => {
    const bp = buildBoilerplate([BUNDLED, VAULT]);
    expect(literatureNoteState(NOTE.replace('- [ ] Read in full', '- [x] Read in full'), bp)).toBe('worked');
    expect(literatureNoteState(NOTE.replace("reading this\n\n- ", 'reading this\n\n- For class'), bp)).toBe('worked');
  });
});

// Course notes arrive with the lead author's details and the paper's own
// figures already filled in, inside %% begin … %% blocks. Those blocks are
// handed-out material, so a note with nothing else in it is still blank.
describe('handed-out author and figure blocks', () => {
  const WITH_BLOCKS = NOTE.replace(
    "## Why I'm reading this",
    [
      '## Author information',
      '',
      '%% begin author-info %%',
      '![Jane Doe|160](https://example.org/jane.jpg)',
      '**Jane Doe** (born 1950)',
      '',
      'Jane Doe is a professor of psychology.',
      '%% end author-info %%',
      '',
      '## Figures & images',
      '%% begin paper-figures %%',
      '![[doe2020 fig01.jpeg]]',
      '*Caption from the paper:* Fig. 1. A figure. (p. 3)',
      '%% end paper-figures %%',
      '',
      "## Why I'm reading this",
    ].join('\n')
  );
  test('leave a note untouched', () => {
    expect(literatureNoteState(WITH_BLOCKS, buildBoilerplate([BUNDLED, VAULT]))).toBe('untouched');
  });
  test('writing outside the blocks still counts', () => {
    const worked = WITH_BLOCKS.replace("## Why I'm reading this\n\n- ", "## Why I'm reading this\n\n- To compare cultures");
    expect(literatureNoteState(worked, buildBoilerplate([BUNDLED, VAULT]))).toBe('worked');
  });
});
