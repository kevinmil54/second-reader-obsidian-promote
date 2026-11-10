import type { Moment } from '../moment';

// The parts of Zotero's and Better BibTeX's JSON this plugin reads. Both send
// loosely shaped objects, so each interface names the fields the code relies
// on and leaves the rest as unknown.

export interface ZoteroTag {
  tag: string;
}

export interface ZoteroCollectionJSON {
  key: string;
  name: string;
  parentCollection?: ZoteroCollectionJSON;
}

export interface ZoteroLibrary {
  id: number;
  name: string;
}

// One hit from Better BibTeX's item.search.
export interface ZoteroSearchHit {
  citekey?: string;
  library?: string;
  title?: string;
  issued?: { 'date-parts'?: unknown[][] };
}

// Anything that carries a citation key under one of the names Zotero and
// Better BibTeX use for it.
export interface CiteKeySource {
  citekey?: string;
  citationKey?: string;
  libraryID?: number;
}

// Zotero sends dates as strings; the export turns them into moments before
// they reach a template.
export type DateLike = string | Moment;

// An annotation, either as Zotero reports it (the annotation* fields) or as
// the export reshapes it for templates (the rest).
export interface ZoteroAnnotationJSON {
  key?: string;
  annotationType?: string;
  annotationColor?: string;
  annotationPageLabel?: string;
  annotationText?: string;
  annotationComment?: string;
  annotationImagePath?: string;
  annotationPosition?: { pageIndex?: number; rects?: number[][] };
  dateModified?: string;
  tags?: ZoteroTag[];
  id?: string;
  type?: string;
  color?: string;
  colorCategory?: string;
  date?: DateLike;
  source?: string;
  page?: number;
  pageLabel?: string;
  x?: number;
  y?: number;
  annotatedText?: string;
  comment?: string;
  imagePath?: string;
  imageBaseName?: string;
  imageExtension?: string;
  imageRelativePath?: string;
  desktopURI?: string;
  allTags?: string;
  hashTags?: string;
  nbId?: string;
  attachment?: ZoteroAttachmentJSON;
  [field: string]: unknown;
}

export interface ZoteroAttachmentJSON {
  annotations?: ZoteroAnnotationJSON[];
  uri?: string;
  path?: string;
  select?: string;
  itemKey?: string;
  desktopURI?: string;
  pdfURI?: string;
  dateAdded?: DateLike;
  dateModified?: DateLike;
  [field: string]: unknown;
}

export interface ZoteroNoteJSON {
  note?: string;
  uri?: string;
  desktopURI?: string;
  dateAdded?: DateLike;
  dateModified?: DateLike;
  relations?: unknown;
  [field: string]: unknown;
}

// A Zotero item with the fields the export adds before rendering.
export interface ZoteroItemJSON extends CiteKeySource {
  uri?: string;
  select?: string;
  itemKey?: string;
  desktopURI?: string;
  accessDate?: DateLike;
  dateAdded?: DateLike;
  dateModified?: DateLike;
  date?: unknown;
  collections?: unknown;
  bibliography?: string;
  relations?: unknown;
  notes?: ZoteroNoteJSON[];
  attachments?: ZoteroAttachmentJSON[];
  annotations?: ZoteroAnnotationJSON[];
  newAnnotations?: ZoteroAnnotationJSON[];
  creators?: Array<{ creatorType: string; [field: string]: unknown }>;
  tags?: ZoteroTag[];
  importDate?: Moment;
  exportDate?: Moment;
  lastImportDate?: Moment;
  lastExportDate?: Moment;
  isFirstImport?: boolean;
  [field: string]: unknown;
}
