import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

import {
  backupPathFor,
  hasHighlightImport,
  upgradeTemplateText,
} from '../../templateUpgrade';

const ROOT = path.resolve(__dirname, '../../..');
const NEW = readFileSync(
  path.join(ROOT, 'Templates/Literature Note Template - Zotero Import.md'),
  'utf8'
);
// The template students were given with Second Reader 1.x.
const OLD_1X = execSync(
  'git show "1610bfd:Templates/Literature Note Template - Zotero Import.md"',
  { cwd: ROOT, encoding: 'utf8' }
);

describe('upgradeTemplateText', () => {
  test('the 1.x template upgrades to exactly the current template', () => {
    expect(hasHighlightImport(OLD_1X)).toBe(false);
    expect(upgradeTemplateText(OLD_1X, NEW)).toBe(NEW);
  });

  test("a student's customizations outside the Quotes section survive", () => {
    const custom = OLD_1X.replace(
      '## Open questions this raises',
      '## My own section\n- keep me\n\n## Open questions this raises'
    ).replace('status: literature', 'status: literature\nmy-field: keep');
    const upgraded = upgradeTemplateText(custom, NEW)!;

    expect(hasHighlightImport(upgraded)).toBe(true);
    expect(upgraded).toContain('## My own section\n- keep me');
    expect(upgraded).toContain('my-field: keep');
    expect(upgraded).toContain('## Figures & images');
    expect(upgraded.match(/## Quotes worth keeping/g)).toHaveLength(1);
  });

  test('already-upgraded templates are left alone', () => {
    expect(upgradeTemplateText(NEW, NEW)).toBeNull();
  });

  test("templates without a Quotes section aren't touched", () => {
    expect(upgradeTemplateText('# {{title}}\n\n## Notes\n', NEW)).toBeNull();
  });

  test('works when Quotes is the last section', () => {
    const t = '# T\n\n## Quotes worth keeping\n> "..." (p. )\n';
    const upgraded = upgradeTemplateText(t, NEW)!;
    expect(upgraded.startsWith('# T\n\n## Quotes worth keeping')).toBe(true);
    expect(hasHighlightImport(upgraded)).toBe(true);
  });
});

test('backupPathFor never collides', () => {
  const taken = new Set([
    'Templates/Lit (before Second Reader 2).md',
    'Templates/Lit (before Second Reader 2, 2).md',
  ]);
  expect(backupPathFor('Templates/Lit.md', (p) => taken.has(p))).toBe(
    'Templates/Lit (before Second Reader 2, 3).md'
  );
  expect(backupPathFor('Templates/Other.md', () => false)).toBe(
    'Templates/Other (before Second Reader 2).md'
  );
});
