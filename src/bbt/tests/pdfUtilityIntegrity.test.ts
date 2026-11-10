import {
  PDF_UTILITY_RELEASE,
  PDF_UTILITY_SHA256,
  checkPdfUtilityDownload,
  pdfUtilityFileName,
  pdfUtilityFileNames,
  pdfUtilityUrl,
  sha256Hex,
} from '../../pdfUtilityIntegrity';

describe('PDF utility download checks', () => {
  it('knows the hash of every file the plugin can download', () => {
    const names = pdfUtilityFileNames();
    expect(names.length).toBeGreaterThan(0);

    for (const fileName of names) {
      expect(PDF_UTILITY_SHA256[fileName]).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('looks up the file for a platform and builds its release url', () => {
    expect(pdfUtilityFileName('darwin', 'arm64')).toBe(
      'pdfannots2json.Mac.M1.tar.gz'
    );
    expect(pdfUtilityFileName('freebsd', 'x64')).toBeNull();
    expect(pdfUtilityUrl('pdfannots2json.Mac.M1.tar.gz')).toBe(
      `https://github.com/mgmeyers/pdfannots2json/releases/download/${PDF_UTILITY_RELEASE}/pdfannots2json.Mac.M1.tar.gz`
    );
  });

  it('accepts bytes that match and refuses bytes that do not', () => {
    const data = new TextEncoder().encode('not the real utility');
    const original = PDF_UTILITY_SHA256['pdfannots2json.Mac.M1.tar.gz'];

    try {
      PDF_UTILITY_SHA256['pdfannots2json.Mac.M1.tar.gz'] = sha256Hex(data);
      expect(() =>
        checkPdfUtilityDownload(
          PDF_UTILITY_RELEASE,
          'pdfannots2json.Mac.M1.tar.gz',
          data
        )
      ).not.toThrow();
    } finally {
      PDF_UTILITY_SHA256['pdfannots2json.Mac.M1.tar.gz'] = original;
    }

    expect(() =>
      checkPdfUtilityDownload(
        PDF_UTILITY_RELEASE,
        'pdfannots2json.Mac.M1.tar.gz',
        data
      )
    ).toThrow(/checksum/);
  });

  it('refuses a release or file it has no hash for', () => {
    const data = new Uint8Array([1, 2, 3]);

    expect(() =>
      checkPdfUtilityDownload('9.9.9', 'pdfannots2json.Mac.M1.tar.gz', data)
    ).toThrow(/No checksum/);
    expect(() =>
      checkPdfUtilityDownload(PDF_UTILITY_RELEASE, 'something-else.zip', data)
    ).toThrow(/No checksum/);
  });
});
