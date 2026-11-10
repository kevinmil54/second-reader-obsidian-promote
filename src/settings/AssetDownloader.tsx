import decompress from 'decompress';
import download from 'download';
import { Notice, debounce } from 'obsidian';
import os from 'os';
import React from 'react';
import {
  checkEXEVersion,
  doesEXEExist,
  doesLegacyEXEExist,
  doesLegacyEXEExist2,
  getElectron,
  getExeRoot,
  removeEXE,
  removeLegacyEXE,
  removeLegacyEXE2,
  scopeExe,
} from 'src/helpers';
import {
  PDF_UTILITY_RELEASE,
  checkPdfUtilityDownload,
  pdfUtilityFileName,
  pdfUtilityUrl,
} from 'src/pdfUtilityIntegrity';
import { ZoteroConnectorSettings } from 'src/types';

import { Icon } from './Icon';
import { SettingItem } from './SettingItem';

export const currentVersion = PDF_UTILITY_RELEASE;
export const internalVersion = 1;

function getDownloadFile() {
  return pdfUtilityFileName(os.platform(), os.arch());
}

// Downloads the PDF utility, checks it against its recorded checksum, and
// only then replaces any copy already installed. Returns false when nothing
// was installed.
export async function downloadAndExtract() {
  const fileName = getDownloadFile();

  if (!fileName) return false;

  try {
    const data = await download(pdfUtilityUrl(fileName));

    checkPdfUtilityDownload(currentVersion, fileName, data);

    if (doesLegacyEXEExist2()) {
      removeLegacyEXE2();
    }

    if (doesLegacyEXEExist()) {
      removeLegacyEXE();
    }

    if (doesEXEExist()) {
      removeEXE();
    }

    await decompress(data, getExeRoot());

    scopeExe();
  } catch (e) {
    console.error(e);
    new Notice(
      'Error downloading PDF utility, or it did not match its expected checksum, so it was not installed. Check the console for more details.',
      10000
    );
    return false;
  }

  return true;
}

export function AssetDownloader(props: {
  settings: ZoteroConnectorSettings;
  updateSetting: (
    key: keyof ZoteroConnectorSettings,
    value: ZoteroConnectorSettings[keyof ZoteroConnectorSettings]
  ) => void;
}) {
  const [isUpToDate, setIsUpToDate] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [exists, setExists] = React.useState(false);
  const [overridePath, setOverridePath] = React.useState(
    props.settings.exeOverridePath
  );

  const setOverride = React.useMemo(
    () =>
      debounce(
        (path: string) => {
          setOverridePath(path);
          props.updateSetting('exeOverridePath', path);
        },
        150,
        true
      ),
    []
  );

  React.useEffect(() => {
    const exists = doesEXEExist(overridePath);
    setExists(exists);

    if (exists) {
      checkEXEVersion(overridePath)
        .then((version) => {
          setIsUpToDate(`v${currentVersion}` === version);
        })
        .catch(() => {});
    }
  }, [overridePath]);

  const handleDownload = React.useCallback(() => {
    setIsLoading(true);

    downloadAndExtract().then((success) => {
      setIsLoading(false);

      if (success) {
        setIsUpToDate(true);
        setExists(true);
      }
    });
  }, []);

  const desc = [
    'Extracting data from PDFs requires an external tool.',
    'This plugin will still work without it, but annotations will not be included in exports.',
  ];

  const overrideDesc = (
    <>
      Override the path to the PDF utility. Specify an absolute path to the
      pdfannots2json executable.{' '}
      <a
        href="https://github.com/mgmeyers/pdfannots2json/releases"
        target="_blank"
        rel="noreferrer"
      >
        Download the executable here.
      </a>{' '}
      You may need to provide Obsidian the appropriate OS permissions to access
      the executable.
    </>
  );

  const Override = (
    <SettingItem name="PDF Utility Path Override" description={overrideDesc}>
      <input
        onChange={(e) => setOverride((e.target as HTMLInputElement).value)}
        type="text"
        spellCheck={false}
        value={overridePath}
      />
      <div
        className="clickable-icon setting-editor-extra-setting-button"
        aria-label="Select the pdfannots2json executable"
        onClick={() => {
          const path = getElectron().remote.dialog.showOpenDialogSync({
            properties: ['openFile'],
          });

          if (path && path.length) {
            setOverride(path[0]);
          }
        }}
      >
        <Icon name="lucide-folder-open" />
      </div>
    </SettingItem>
  );

  if (exists && isUpToDate) {
    return (
      <>
        <SettingItem name="PDF Utility" description={desc.join(' ')}>
          <div className="zt-asset-success">
            <div className="zt-asset-success__icon">
              <Icon name="check-small" />
            </div>
            <div className="zt-asset-success__message">
              PDF utility is up to date.
            </div>
          </div>
        </SettingItem>
        {Override}
      </>
    );
  }

  const descFrag = (
    <>
      {desc.join(' ')}{' '}
      {exists && (
        <strong className="mod-warning">
          The PDF extraction tool requires updating. Please re-download.
        </strong>
      )}
      {!exists && !overridePath && (
        <strong>Click the button to download.</strong>
      )}
    </>
  );

  return (
    <>
      <SettingItem name="PDF Utility" description={descFrag}>
        {!overridePath && (
          <button disabled={isLoading} onClick={handleDownload}>
            {isLoading ? 'Downloading...' : 'Download'}
          </button>
        )}
      </SettingItem>
      {Override}
    </>
  );
}
