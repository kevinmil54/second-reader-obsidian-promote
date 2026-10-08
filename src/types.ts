import { PromoteSettings } from './promote';


export type Format =
  | 'latex'
  | 'biblatex'
  | 'pandoc'
  | 'formatted-citation'
  | 'formatted-bibliography'
  | 'template';

export interface CitationFormat {
  name: string;
  format: Format;
  command?: string;
  brackets?: boolean;
  cslStyle?: string;
  template?: string;
}

export type Database = 'Zotero' | 'Juris-M' | 'Custom';
export type DatabaseWithPort = {
  database: Database;
  port?: string;
};

export type NotesToOpenAfterImport =
  | 'first-imported-note'
  | 'last-imported-note'
  | 'all-imported-notes';

export interface CalloutDef {
  type: string;
  prefix: string;
}

export enum GroupingOptions {
  Tag = 'tag',
  AnnotationDate = 'annotation-date',
  ExportDate = 'export-date',
  Color = 'color',
}

export enum SortingOptions {
  Color = 'color',
  Date = 'date',
  Location = 'location',
}

export interface ExportFormat {
  name: string;
  outputPathTemplate: string;
  imageOutputPathTemplate: string;
  imageBaseNameTemplate: string;

  templatePath?: string;
  cslStyle?: string;

  // Deprecated
  headerTemplatePath?: string;
  annotationTemplatePath?: string;
  footerTemplatePath?: string;
}

export interface ExportToMarkdownParams {
  settings: ZoteroConnectorSettings;
  database: DatabaseWithPort;
  exportFormat: ExportFormat;
}

export interface RenderCiteTemplateParams {
  database: DatabaseWithPort;
  format: CitationFormat;
}

export interface ZoteroConnectorSettings extends PromoteSettings {
  // Set once the old Zotero Integration plugin's settings have been copied in
  // (or there were none to copy), so the import never runs twice.
  _importedLegacyZoteroSettings?: boolean;
  // The plugin version whose startup offer to update the template a student
  // turned down. Not asked again at startup until a newer version brings a
  // new reason to update (sync and import still ask when it matters).
  _templateUpgradeDeclinedVersion?: string;
  // Same, for the offer to name literature notes by title.
  _noteNamingDeclinedVersion?: string;
  // Goes in the name of the zip made by "Package a week's literature notes".
  studentName?: string;
  citeFormats: CitationFormat[];
  citeSuggestTemplate?: string;
  database: Database;
  port?: string;
  exeVersion?: string;
  _exeInternalVersion?: number;
  exeOverridePath?: string;
  exportFormats: ExportFormat[];
  noteImportFolder: string;
  openNoteAfterImport: boolean;
  pdfExportImageDPI?: number;
  pdfExportImageFormat?: string;
  pdfExportImageOCR?: boolean;
  pdfExportImageOCRLang?: string;
  pdfExportImageQuality?: number;
  pdfExportImageTessDataDir?: string;
  pdfExportImageTesseractPath?: string;
  settingsVersion?: number;
  shouldConcat?: boolean;
  whichNotesToOpenAfterImport: NotesToOpenAfterImport;
}

export interface CiteKeyExport {
  libraryID: number;
  citekey: string;
  title: string;
}
