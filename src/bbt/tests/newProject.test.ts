import engelbartLetter from './fixtures/engelbart-letter.md';
import instructorTemplate from './fixtures/instructor-project-template.md';
import studentTemplate from './fixtures/student-project-template.md';
import letterTemplate from '../../../Templates/Project Letter Template.md';
import {
  LETTER_FALLBACK,
  DEFAULT_PROJECT_SETTINGS,
  OUTPUT_TYPES,
  PROJECT_NOTE_FALLBACK,
  SUBSTACK_NOTE_FALLBACK,
  addLetterLink,
  fillProjectTemplate,
  localDate,
  projectName,
  projectNoteSource,
  yamlValue,
} from '../../newProjectCore';
import { isPromotableNote } from '../../promote';

jest.mock(
  'obsidian',
  () => ({
    Notice: class {},
    TFile: class {},
    normalizePath: (p: string) => p,
  }),
  { virtual: true }
);

const fill = {
  name: 'Engelbart cul-de-sac',
  outputType: 'article',
  date: '2026-11-17',
  letter: 'Engelbart cul-de-sac - letter',
};

function frontmatter(text: string): string[] {
  return /^---\n([\s\S]*?)\n---/.exec(text)![1].split('\n');
}

describe('projectName', () => {
  test('keeps an ordinary title', () => {
    expect(projectName('Engelbart cul-de-sac')).toBe('Engelbart cul-de-sac');
  });
  test('removes what Windows and Obsidian links cannot hold', () => {
    expect(projectName('Why? A "study": a/b #1')).toBe('Why A study a b 1');
  });
  test('is empty when nothing usable is left', () => {
    expect(projectName('  ?? / ')).toBe('');
    expect(projectName('...')).toBe('');
  });
  test('avoids a Windows device name', () => {
    expect(projectName('con')).toBe('con note');
  });
});

describe('yamlValue', () => {
  test('leaves a plain title alone', () => {
    expect(yamlValue('Engelbart cul-de-sac')).toBe('Engelbart cul-de-sac');
    expect(yamlValue('2026 plan')).toBe('2026 plan');
  });
  test('quotes what YAML would misread', () => {
    expect(yamlValue('Yes')).toBe('"Yes"');
    expect(yamlValue('2026')).toBe('"2026"');
    expect(yamlValue('- first')).toBe('"- first"');
    expect(yamlValue('&anchor')).toBe('"&anchor"');
    expect(yamlValue('a: b')).toBe('"a: b"');
  });
});

describe('localDate', () => {
  test('uses the local calendar day, zero-padded', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('fillProjectTemplate with the instructor project template', () => {
  const out = fillProjectTemplate(instructorTemplate, fill)!;

  test('fills every Templater expression', () => {
    expect(out).not.toBeNull();
    expect(out).not.toContain('<%');
  });
  test('sets the properties', () => {
    const fm = frontmatter(out);
    expect(fm).toContain('type: project');
    expect(fm).toContain('project: Engelbart cul-de-sac');
    expect(fm).toContain('output-type: article');
    expect(fm).toContain('status: Active');
    expect(fm).toContain('created: 2026-11-17');
    expect(fm).toContain('tags: [project]');
  });
  test('adds topics after tags', () => {
    const fm = frontmatter(out);
    expect(fm[fm.indexOf('tags: [project]') + 1]).toBe('topics: [Engelbart cul-de-sac]');
  });
  test('titles the note and links the letter under the title', () => {
    expect(out).toContain(
      '# Engelbart cul-de-sac\n\nLetter to the second reader: [[Engelbart cul-de-sac - letter]]\n\n## What this is for'
    );
  });
  test('leaves the rest of the template as it was', () => {
    expect(out).toContain('WHERE project = this.project AND file.name != this.file.name');
    expect(out).toContain('## Notes I\'m drawing on');
    expect(out).toContain('draft: ""');
  });
  test('does not link the letter twice', () => {
    expect(out.split('[[Engelbart cul-de-sac - letter]]')).toHaveLength(2);
  });
});

describe('fillProjectTemplate with the student project template', () => {
  const out = fillProjectTemplate(studentTemplate, { ...fill, name: 'Final project' })!;

  test('fills the empty project property and keeps the template\'s own output type', () => {
    const fm = frontmatter(out);
    expect(fm).toContain('project: Final project');
    expect(fm).toContain('output-type: paper');
    expect(fm).toContain('created: 2026-11-17');
    expect(fm).toContain('topics: [Final project]');
  });
  test('fills the title and links the letter', () => {
    expect(out).toContain('# Final project\n\nLetter to the second reader: [[Engelbart cul-de-sac - letter]]');
  });
});

describe('fillProjectTemplate edge cases', () => {
  test('gives up on Templater code it cannot fill', () => {
    const t = '---\nproject: x\n---\n\n# <% tp.file.title %>\n\n<% tp.file.cursor() %>\n';
    expect(fillProjectTemplate(t, fill)).toBeNull();
  });
  test('a "$" in a title is not read as a replacement pattern', () => {
    const out = fillProjectTemplate('---\nproject: {{project}}\n---\n\n# {{title}}\n', {
      ...fill,
      name: 'Costs $& benefits',
      letter: undefined,
    })!;
    expect(out).toContain('# Costs $& benefits');
    expect(out).toContain('project: Costs $& benefits');
  });
  test('a title with a comma keeps the topics list a single topic', () => {
    const out = fillProjectTemplate('---\nproject: {{project}}\ntopics: [{{topics}}]\n---\n', {
      ...fill,
      name: 'Talks, then papers',
      letter: undefined,
    })!;
    expect(out).toContain('topics: [Talks then papers]');
  });
});

describe('addLetterLink', () => {
  test('goes under the properties when the note has no title', () => {
    const out = addLetterLink('---\ntype: project\n---\n\n## Plan\n', 'X - letter');
    expect(out).toBe('---\ntype: project\n---\n\nLetter to the second reader: [[X - letter]]\n\n## Plan\n');
  });
});

describe('the project letter', () => {
  test('the built-in letter is the same text as Templates/Project Letter Template.md', () => {
    expect(LETTER_FALLBACK).toBe(letterTemplate);
  });
  test('filled in, it matches the Engelbart letter', () => {
    const out = fillProjectTemplate(letterTemplate, {
      name: 'Engelbart cul-de-sac',
      outputType: 'article',
      date: '2026-11-14',
    });
    expect(out).toBe(engelbartLetter);
  });
});

describe('the built-in project note', () => {
  const out = fillProjectTemplate(PROJECT_NOTE_FALLBACK, fill)!;
  test('has the instructor template\'s properties and sections', () => {
    expect(out).not.toContain('{{');
    expect(frontmatter(out)).toEqual([
      'type: project',
      'project: Engelbart cul-de-sac',
      'output-type: article',
      'status: Active',
      'synthesis: []',
      'draft: ""',
      'created: 2026-11-17',
      'tags: [project]',
      'topics: [Engelbart cul-de-sac]',
    ]);
    expect(out).toContain('Letter to the second reader: [[Engelbart cul-de-sac - letter]]');
  });
  test('matches what the instructor template gives, apart from the topics line position', () => {
    const fromTemplate = fillProjectTemplate(instructorTemplate, fill)!;
    const body = (t: string) => t.slice(t.indexOf('\n---\n') + 5);
    expect(body(out)).toBe(body(fromTemplate));
  });
});

describe('isPromotableNote', () => {
  test('literature notes and project letters', () => {
    expect(isPromotableNote(['literature-note'], undefined)).toBe(true);
    expect(isPromotableNote(['project-log'], undefined)).toBe(true);
    expect(isPromotableNote([], 'project-log')).toBe(true);
  });
  test('nothing else', () => {
    expect(isPromotableNote(['project'], 'project')).toBe(false);
    expect(isPromotableNote([], undefined)).toBe(false);
  });
});

describe('Substack post project note', () => {
  const substackFill = { ...fill, name: 'Less is more', outputType: 'substack-post' };

  test('substack-post is an output type', () => {
    expect(OUTPUT_TYPES).toContain('substack-post');
  });

  test('routes to its own template and built-in note', () => {
    const s = projectNoteSource('substack-post', DEFAULT_PROJECT_SETTINGS);
    expect(s.templatePath).toBe('Templates/Substack Project Template.md');
    expect(s.fallback).toBe(SUBSTACK_NOTE_FALLBACK);
    const other = projectNoteSource('article', DEFAULT_PROJECT_SETTINGS);
    expect(other.templatePath).toBe('Templates/Project Template.md');
    expect(other.fallback).toBe(PROJECT_NOTE_FALLBACK);
  });

  test('built-in note keeps the post properties and fills the project ones', () => {
    const out = fillProjectTemplate(SUBSTACK_NOTE_FALLBACK, substackFill)!;
    const fm = frontmatter(out);
    expect(fm).toContain('project: Less is more');
    expect(fm).toContain('output-type: substack-post');
    expect(fm).toContain('status: draft');
    expect(fm).toContain('title: "Less is more"');
    expect(fm).toContain('image_license: public domain');
    expect(fm).toContain('published_url: ""');
    expect(out).toContain('Public domain. [Source](url)');
    expect(fm).toContain('tags: [project, substack, timely-snow]');
    expect(fm.some((l) => l.startsWith('topics:'))).toBe(true);
    expect(out).toContain('[[Engelbart cul-de-sac - letter]]');
    expect(out).not.toMatch(/\{\{|<%/);
  });
});
