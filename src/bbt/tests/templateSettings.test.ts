import fs from 'fs';
import path from 'path';

import { buildBoilerplate, splitTemplateVersions } from '../../litNoteState';
import PAST from '../../pastLiteratureTemplates.md';
import { readTemplateSettings, splitLeadingComments } from '../../templateSettings';
import { upgradeTemplateText } from '../../templateUpgrade';
import { template } from '../template.env';

jest.mock('obsidian', () => ({ moment: require('moment') }), { virtual: true });

const BUNDLED = fs.readFileSync(
  path.join(__dirname, '../../../Templates/Literature Note Template - Zotero Import.md'),
  'utf8'
);

describe('template settings', () => {
  test('reads reference-style and author-info', () => {
    expect(readTemplateSettings(BUNDLED)).toEqual({ referenceStyle: 'apa', authorInfo: 'photos' });
    expect(
      readTemplateSettings('{# reference-style: chicago-author-date #}\n{#- author-info: NONE -#}')
    ).toEqual({ referenceStyle: 'chicago-author-date', authorInfo: 'none' });
    expect(readTemplateSettings('{#- author-info: sometimes -#}')).toEqual({});
    expect(readTemplateSettings(null)).toEqual({});
  });

  test('comments vanish and properties stay on the first line', () => {
    const out = template.renderString(
      '{#- note -#}\n{#- reference-style: apa -#}\n---\ntitle: x\n---\nbody',
      {}
    );
    expect(out).toBe('---\ntitle: x\n---\nbody');
  });

  test('settings lines are not counted as template text in notes', () => {
    const { exact } = buildBoilerplate([BUNDLED]);
    expect([...exact].some((l) => l.includes('reference-style'))).toBe(false);
    expect([...exact].some((l) => l.startsWith('title:'))).toBe(false);
  });

  test('upgrading an old template adds the settings block once', () => {
    const old = splitLeadingComments(BUNDLED).body;
    const up = upgradeTemplateText(old, BUNDLED);
    expect(up).not.toBeNull();
    expect(readTemplateSettings(up!)).toEqual({ referenceStyle: 'apa', authorInfo: 'photos' });
    expect(upgradeTemplateText(up!, BUNDLED)).toBeNull();
    const custom = '{#- reference-style: modern-language-association -#}\n' + old;
    expect(upgradeTemplateText(custom, BUNDLED)).toBeNull();
  });
});

describe('reworded author prompt', () => {
  test("the old prompt in existing notes still counts as template text", () => {
    const past = splitTemplateVersions(PAST);
    const { exact } = buildBoilerplate([BUNDLED, ...past]);
    expect(
      [...exact].some((l) => l.startsWith("*Who wrote this? Add the lead author's photo"))
    ).toBe(true);
  });
});
