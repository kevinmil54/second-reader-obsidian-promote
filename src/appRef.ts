import type { App } from 'obsidian';

// Obsidian's global `app` is deprecated in favour of the reference the plugin
// instance holds. Code outside the plugin class (the Zotero export pipeline,
// the template helpers) reaches the app through here; the plugin sets it once
// on load.
let current: App | null = null;

export function setApp(app: App) {
  current = app;
}

export function getApp(): App {
  if (!current) throw new Error('Second Reader has not finished loading yet.');
  return current;
}
