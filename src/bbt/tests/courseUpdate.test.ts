// A minimal in-memory vault, enough for applyCourseUpdate.
class MockAbstractFile {
  constructor(public path: string) {}
  get name() {
    return this.path.split('/').pop()!;
  }
}
class MockTFile extends MockAbstractFile {
  get basename() {
    return this.name.replace(/\.[^.]+$/, '');
  }
  get extension() {
    return this.name.split('.').pop()!;
  }
}
class MockTFolder extends MockAbstractFile {
  children: MockAbstractFile[] = [];
  isRoot() {
    return this.path === '/';
  }
}
const mockNotices: string[] = [];
jest.mock(
  'obsidian',
  () => ({
    get TFile() {
      return MockTFile;
    },
    get TFolder() {
      return MockTFolder;
    },
    Notice: class {
      constructor(m: string) {
        mockNotices.push(m);
      }
    },
    FuzzySuggestModal: class {},
    normalizePath: (p: string) => p.replace(/\/+/g, '/').replace(/^\/|\/$/g, ''),
  }),
  { virtual: true }
);

import { applyCourseUpdate, findUpdateFolders } from '../../courseUpdateUI';
import { incomingKind, noteAction } from '../../courseUpdate';

function makeVault(files: Record<string, string>) {
  const data = new Map(Object.entries(files));
  const trashed: string[] = [];
  const folders = () => {
    const set = new Set<string>();
    for (const p of data.keys()) {
      const parts = p.split('/');
      for (let i = 1; i < parts.length; i++) set.add(parts.slice(0, i).join('/'));
    }
    return set;
  };
  const fileObj = (p: string) => new MockTFile(p);
  const folderObj = (p: string) => {
    const f = new MockTFolder(p);
    for (const q of data.keys()) {
      const rest = q.startsWith(p + '/') ? q.slice(p.length + 1) : null;
      if (rest === null) continue;
      const first = rest.split('/')[0];
      if (!f.children.some((c) => c.name === first)) {
        f.children.push(rest.includes('/') ? new MockTFolder(`${p}/${first}`) : new MockTFile(`${p}/${first}`));
      }
    }
    return f;
  };
  const vault = {
    getFiles: () => [...data.keys()].map(fileObj),
    getMarkdownFiles: () => [...data.keys()].filter((p) => p.endsWith('.md')).map(fileObj),
    getAllLoadedFiles: () => [...[...folders()].map(folderObj), ...[...data.keys()].map(fileObj)],
    getAbstractFileByPath: (p: string) =>
      data.has(p) ? fileObj(p) : folders().has(p) ? folderObj(p) : null,
    read: async (f: MockTFile) => data.get(f.path)!,
    readBinary: async (f: MockTFile) => data.get(f.path)!,
    modify: async (f: MockTFile, t: string): Promise<void> => void data.set(f.path, t),
    create: async (p: string, t: string) => {
      if (data.has(p)) throw new Error('exists ' + p);
      data.set(p, t);
    },
    createBinary: async (p: string, t: any): Promise<void> => void data.set(p, t),
    createFolder: async () => {},
    trash: async (f: MockTFolder) => {
      for (const p of [...data.keys()]) {
        if (p.startsWith(f.path + '/')) {
          data.delete(p);
          trashed.push(p);
        }
      }
    },
  };
  return { data, trashed, app: { vault } as any };
}

const U = 'ED 336 update';
const STATES: Record<string, 'untouched' | 'highlights' | 'worked'> = {
  'Literature notes/Blank.md': 'untouched',
  'Literature notes/Mine.md': 'worked',
  'Literature notes/Quotes.md': 'highlights',
};

describe('noteAction', () => {
  test('adds, replaces only blank notes, keeps everything else', () => {
    expect(noteAction(undefined)).toBe('add');
    expect(noteAction({ state: 'untouched' })).toBe('replace');
    expect(noteAction({ state: 'highlights' })).toBe('keep');
    expect(noteAction({ state: 'worked' })).toBe('keep');
    expect(noteAction({ state: null })).toBe('keep');
  });
});

describe('incomingKind', () => {
  test('sorts the update folder', () => {
    expect(incomingKind('Literature notes/A.md')).toBe('note');
    expect(incomingKind('Attachments/k/fig.jpeg')).toBe('attachment');
    expect(incomingKind('Templates/T.md')).toBe('template');
    expect(incomingKind('How was GenAI used.md')).toBe('extra');
    expect(incomingKind('READ ME FIRST.md')).toBe('ignore');
    expect(incomingKind('Literature notes/.DS_Store')).toBe('ignore');
  });
});

describe('applyCourseUpdate', () => {
  const setup = () =>
    makeVault({
      'Literature notes/Blank.md': 'old blank',
      'Literature notes/Mine.md': 'my writing',
      'Literature notes/Quotes.md': 'my highlights',
      'Attachments/k/fig01.jpeg': 'MY IMAGE',
      'Templates/T.md': 'old template',
      [`${U}/READ ME FIRST.md`]: 'readme',
      [`${U}/How was GenAI used.md`]: 'genai',
      [`${U}/Templates/T.md`]: 'new template',
      [`${U}/Literature notes/Blank.md`]: 'new blank',
      [`${U}/Literature notes/Mine.md`]: 'new mine',
      [`${U}/Literature notes/Quotes.md`]: 'new quotes',
      [`${U}/Literature notes/Brand new.md`]: 'new note',
      [`${U}/Attachments/k/fig01.jpeg`]: 'NEW IMAGE',
      [`${U}/Attachments/j/fig01.jpeg`]: 'FIG J',
    });

  test('finds the update folder', () => {
    const { app } = setup();
    expect(findUpdateFolders(app).map((f) => f.path)).toEqual([U]);
  });

  test("never overwrites a student's writing or highlights", async () => {
    const { app, data, trashed } = setup();
    const reloaded: string[][] = [];
    const s = await applyCourseUpdate(
      {
        app,
        noteState: async (f: any) => STATES[f.path] ?? null,
        reloadTemplates: async (t: string[]) => void reloaded.push(t),
      },
      new MockTFolder(U) as any
    );
    expect(data.get('Literature notes/Mine.md')).toBe('my writing');
    expect(data.get('Literature notes/Quotes.md')).toBe('my highlights');
    expect(data.get('Literature notes/Blank.md')).toBe('new blank');
    expect(data.get('Literature notes/Brand new.md')).toBe('new note');
    expect(data.get('Attachments/k/fig01.jpeg')).toBe('MY IMAGE');
    expect(data.get('Attachments/j/fig01.jpeg')).toBe('FIG J');
    expect(data.get('Templates/T.md')).toBe('new template');
    expect(data.get('How was GenAI used.md')).toBe('genai');
    expect(data.has('READ ME FIRST.md')).toBe(false);
    expect(reloaded).toEqual([['new template']]);
    expect(s.added).toEqual(['Brand new']);
    expect(s.replaced).toEqual(['Blank']);
    expect(s.kept.sort()).toEqual(['Mine', 'Quotes']);
    expect([...data.keys()].some((p) => p.startsWith(U + '/'))).toBe(false);
    expect(trashed.length).toBe(9);
    expect(mockNotices.pop()).toMatch(/Kept your own notes for: Mine; Quotes/);
  });
});
