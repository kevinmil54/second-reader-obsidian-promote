import { CitationFormat, ExportFormat } from './types';

// APA 7th edition, as Better BibTeX / Zotero name it.
export const DEFAULT_CSL_STYLE = 'apa';

// The import format the setup guide has students create by hand. Second
// Reader starts with it so the literature-note command and the APA reference
// work without any setup.
export function defaultLiteratureFormat(): ExportFormat {
  return {
    name: 'Literature Note',
    templatePath: 'Templates/Literature Note Template - Zotero Import.md',
    outputPathTemplate: 'Literature notes/{{title}}.md',
    imageOutputPathTemplate: 'Attachments/{{citekey}}/',
    imageBaseNameTemplate: 'image',
    cslStyle: DEFAULT_CSL_STYLE,
  };
}

export function defaultCiteFormat(): CitationFormat {
  return {
    name: 'APA citation',
    format: 'formatted-citation',
    cslStyle: DEFAULT_CSL_STYLE,
  };
}
