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
