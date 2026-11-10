import { errorMessage } from './errors';
import fs from 'fs';
import { FileSystemAdapter, Notice } from 'obsidian';
import os from 'os';
import path from 'path';

import { getApp } from './appRef';
import { runFile } from './runFile';

// The slice of Electron this plugin uses. Electron is provided by Obsidian's
// desktop app, so it is loaded through the window rather than bundled.
interface ElectronApi {
  remote: {
    BrowserWindow: { getFocusedWindow(): { show(): void } };
    dialog: {
      showOpenDialogSync(options: {
        properties: string[];
      }): string[] | undefined;
    };
  };
  shell: {
    openExternal(url: string): Promise<void>;
    showItemInFolder(fullPath: string): void;
  };
}

export function getElectron(): ElectronApi {
  return (window as unknown as { require(id: string): ElectronApi }).require(
    'electron'
  );
}

export function getCurrentWindow() {
  return getElectron().remote.BrowserWindow.getFocusedWindow();
}

export function padNumber(n: number): string {
  return n < 10 ? `0${n}` : n.toString();
}

export function getVaultRoot() {
  return (getApp().vault.adapter as FileSystemAdapter).getBasePath();
}

// Vault-relative folder this plugin is installed in (manifest.dir), set on
// load. Upstream hardcoded its own folder name and ".obsidian", which breaks
// under a different plugin id or a renamed config folder.
let pluginDir = '';

export function setPluginDir(dir: string) {
  pluginDir = dir;
}

export function getExeRoot() {
  return path.join(getVaultRoot(), pluginDir);
}

export function getExeName() {
  return os.platform() === 'win32'
    ? 'pdfannots2json.exe'
    : `pdfannots2json-${os.platform()}-${os.arch()}`;
}

export function scopeExe() {
  if (os.platform() === 'win32') {
    return;
  }

  fs.renameSync(
    path.join(getExeRoot(), getLegacyExeName()),
    path.join(getExeRoot(), getExeName())
  );
}

export function getLegacyExeName() {
  return os.platform() === 'win32' ? 'pdfannots2json.exe' : 'pdfannots2json';
}

export function getLegacyExeName2() {
  return os.platform() === 'win32' ? 'pdf-annots2json.exe' : 'pdf-annots2json';
}

export function doesEXEExist(override?: string) {
  if (override) return fs.existsSync(override);
  return fs.existsSync(path.join(getExeRoot(), getExeName()));
}

export function doesLegacyEXEExist(override?: string) {
  if (override) return fs.existsSync(override);
  return fs.existsSync(path.join(getExeRoot(), getLegacyExeName()));
}

export function doesLegacyEXEExist2() {
  return fs.existsSync(path.join(getExeRoot(), getLegacyExeName2()));
}

export function removeEXE() {
  fs.rmSync(path.join(getExeRoot(), getExeName()));
}

export function removeLegacyEXE() {
  fs.rmSync(path.join(getExeRoot(), getLegacyExeName()));
}

export function removeLegacyEXE2() {
  fs.rmSync(path.join(getExeRoot(), getLegacyExeName2()));
}

export async function checkEXEVersion(override?: string) {
  try {
    const result = await runFile(
      override || path.join(getExeRoot(), getExeName()),
      ['-v']
    );

    if (result.stderr && !result.stderr.includes('warning')) {
      new Notice(`Error checking PDF utility version: ${result.stderr}`, 10000);
      throw new Error(result.stderr);
    }

    return result.stdout.trim();
  } catch (e) {
    console.error(e);
    new Notice(`Error checking PDF utility version: ${errorMessage(e)}`, 10000);
    throw e;
  }
}

export function getExecutableMode(mode = 0) {
  return (
    mode | fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH
  );
}

function handleError(err: unknown) {
  console.error('Error: pdfannots2json not executable', err);

  if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
    return false;
  } else {
    return undefined;
  }
}

export function ensureExecutableSync(override?: string) {
  const file = override || path.join(getExeRoot(), getExeName());

  try {
    fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    //
  }

  try {
    const stats = fs.statSync(file);
    fs.chmodSync(file, getExecutableMode(stats.mode));
    return true;
  } catch (err) {
    return handleError(err);
  }
}
