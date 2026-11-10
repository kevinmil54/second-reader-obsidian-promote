import { createHash } from 'crypto';

// The PDF utility (pdfannots2json) is a program this plugin downloads and
// then runs. Each release file is checked against the SHA-256 recorded here
// before anything is unpacked, so a file that was swapped or damaged on the
// way is refused instead of run. The hashes were taken from the files on the
// project's GitHub releases page (github.com/mgmeyers/pdfannots2json); when
// the release below changes, the hashes must be replaced with it.
export const PDF_UTILITY_RELEASE = '1.0.15';

export const PDF_UTILITY_SHA256: Record<string, string> = {
  'pdfannots2json.Linux.x64.tar.gz':
    'f5cc05baa70ac15da2cc358c79acb296b8630cdc654ed304acf50bd9489a94bd',
  'pdfannots2json.Mac.Intel.tar.gz':
    'ce42fee021b37c38fe131db236ca7711282af899a82eaaaf074bdcc6aebb6c74',
  'pdfannots2json.Mac.M1.tar.gz':
    'c230a4e578e1c2ff2475cb7f6f59d5ee92e4769e7a3b0ef1cee96444922bc5d5',
  'pdfannots2json.Windows.x64.zip':
    '0d1496dce3518a4f6523af784051ddd1f1a2083690da41d39da7a198199aa4f3',
};

// The release file for each operating system and processor.
const FILE_NAMES: Record<string, Record<string, string>> = {
  darwin: {
    x64: 'pdfannots2json.Mac.Intel.tar.gz',
    arm64: 'pdfannots2json.Mac.M1.tar.gz',
  },
  linux: { x64: 'pdfannots2json.Linux.x64.tar.gz' },
  win32: { x64: 'pdfannots2json.Windows.x64.zip' },
};

export function pdfUtilityFileName(platform: string, arch: string) {
  return FILE_NAMES[platform]?.[arch] ?? null;
}

export function pdfUtilityFileNames() {
  return Object.values(FILE_NAMES).flatMap((byArch) => Object.values(byArch));
}

export function pdfUtilityUrl(fileName: string) {
  return `https://github.com/mgmeyers/pdfannots2json/releases/download/${PDF_UTILITY_RELEASE}/${fileName}`;
}

export function sha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

// Throws unless the downloaded bytes are the release file with this name.
export function checkPdfUtilityDownload(
  release: string,
  fileName: string,
  data: Uint8Array
) {
  if (release !== PDF_UTILITY_RELEASE) {
    throw new Error(
      `No checksum is recorded for PDF utility release ${release}.`
    );
  }

  const expected = PDF_UTILITY_SHA256[fileName];

  if (!expected) {
    throw new Error(`No checksum is recorded for ${fileName}.`);
  }

  const actual = sha256Hex(data);

  if (actual !== expected) {
    throw new Error(
      `${fileName} does not match its expected checksum ` +
        `(expected ${expected}, got ${actual}).`
    );
  }
}
