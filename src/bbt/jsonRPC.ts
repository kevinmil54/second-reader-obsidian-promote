import { Notice, htmlToMarkdown, request } from 'obsidian';
import { moment, type Moment } from '../moment';

import { padNumber } from '../helpers';
import { CiteKeyExport, DatabaseWithPort } from '../types';
import { LoadingModal } from './LoadingModal';
import { CiteKey, getCiteKeyFromAny, isZoteroRunning } from './cayw';
import { defaultHeaders, getPort } from './helpers';
import { ZQueue } from './queue';
import type {
  ZoteroAttachmentJSON,
  ZoteroCollectionJSON,
  ZoteroItemJSON,
  ZoteroLibrary,
  ZoteroSearchHit,
} from './zoteroTypes';
import { getApp } from '../appRef';
import { errorMessage } from '../errors';

// A Better BibTeX JSON-RPC response. What `result` holds depends on the method
// that was called, so each caller says what it expects.
interface RpcResponse {
  result?: unknown;
  error?: { message?: string };
}

function parseRpc(res: string): RpcResponse {
  return JSON.parse(res) as RpcResponse;
}

export async function getNotesFromCiteKeys(
  citeKeys: CiteKey[],
  database: DatabaseWithPort
) {
  let res: string;

  const modal = new LoadingModal(getApp(), 'Fetching notes from Zotero...');
  modal.open();

  const qid = Symbol();
  try {
    await ZQueue.wait(qid);
    res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.notes',
        params: [citeKeys.map((k) => k.key)],
      }),
      headers: defaultHeaders,
    });
  } catch (e) {
    console.error(e);
    modal.close();
    new Notice(`Error retrieving notes: ${errorMessage(e)}`, 10000);
    ZQueue.end(qid);
    return null;
  }

  ZQueue.end(qid);
  modal.close();

  try {
    return parseRpc(res).result as Record<string, string[]>;
  } catch (e) {
    console.error(e);
    new Notice(`Error retrieving notes: ${errorMessage(e)}`, 10000);
    return null;
  }
}

export async function getCollectionFromCiteKey(
  citeKey: CiteKey,
  database: DatabaseWithPort
) {
  let res: string;

  const modal = new LoadingModal(getApp(), 'Fetching collections from Zotero...');
  modal.open();

  const qid = Symbol();
  try {
    await ZQueue.wait(qid);
    res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.collections',
        params: [[citeKey.key], true],
      }),
      headers: defaultHeaders,
    });
  } catch (e) {
    console.error(e);
    modal.close();
    new Notice(`Error retrieving notes: ${errorMessage(e)}`, 10000);
    ZQueue.end(qid);
    return null;
  }

  ZQueue.end(qid);
  modal.close();

  try {
    const result = parseRpc(res).result as Record<
      string,
      ZoteroCollectionJSON[]
    >;
    const cols = result[citeKey.key];

    return cols.map((c: ZoteroCollectionJSON) => {
      let pointer = c;
      const fullPath = [c.name];

      while (pointer.parentCollection) {
        fullPath.push(pointer.parentCollection.name);
        pointer = pointer.parentCollection;
      }

      return {
        key: c.key,
        name: c.name,
        fullPath: fullPath.reverse().join('/'),
      };
    });
  } catch (e) {
    console.error(e);
    new Notice(`Error retrieving notes: ${errorMessage(e)}`, 10000);
    return null;
  }
}

export async function getAttachmentsFromCiteKey(
  citeKey: CiteKey,
  database: DatabaseWithPort
) {
  let res: string;

  const modal = new LoadingModal(getApp(), 'Fetching collections from Zotero...');
  modal.open();

  const qid = Symbol();
  try {
    await ZQueue.wait(qid);
    res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.attachments',
        params: [citeKey.key, citeKey.library],
      }),
      headers: defaultHeaders,
    });
  } catch (e) {
    console.error(e);
    modal.close();
    new Notice(`Error retrieving notes: ${errorMessage(e)}`, 10000);
    ZQueue.end(qid);
    return null;
  }

  ZQueue.end(qid);
  modal.close();

  try {
    return parseRpc(res).result as ZoteroAttachmentJSON[];
  } catch (e) {
    console.error(e);
    new Notice(`Error retrieving notes: ${errorMessage(e)}`, 10000);
    return null;
  }
}

let cachedLibs: ZoteroLibrary[] = null;
const cachedCiteKeys: Map<string, number> = new Map();

export async function getLibForCiteKey(
  citeKey: string,
  database: DatabaseWithPort
) {
  if (cachedCiteKeys.has(citeKey)) return cachedCiteKeys.get(citeKey);
  const qid = Symbol();
  try {
    const searchResults = await execSearch(citeKey, database);
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    const match = searchResults.find(
      (res: ZoteroSearchHit) => res.citekey === citeKey
    );
    if (!match) return null;

    if (cachedLibs) {
      const lib = cachedLibs.find((p) => p.name === match.library);
      if (lib) {
        cachedCiteKeys.set(citeKey, lib.id);
        return lib.id;
      }

      return null;
    }

    await ZQueue.wait(qid);
    const res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'user.groups',
      }),
      headers: defaultHeaders,
    });
    ZQueue.end(qid);

    const groups = parseRpc(res).result as ZoteroLibrary[] | undefined;
    if (groups && groups.length > 0) {
      cachedLibs = groups;
      const lib = cachedLibs.find((p) => p.name === match.library);

      if (lib) {
        cachedCiteKeys.set(citeKey, lib.id);
        return lib.id;
      }

      return null;
    }
  } catch (e) {
    console.error(e);
    new Notice(`Error retrieving library id: ${errorMessage(e)}`, 10000);
    ZQueue.end(qid);
  }

  return null;
}

export function getBibFromCiteKey(
  citeKey: CiteKey,
  database: DatabaseWithPort,
  cslStyle?: string,
  format?: string,
  silent?: boolean
) {
  return getBibFromCiteKeys([citeKey], database, cslStyle, format, silent);
}

export async function getBibFromCiteKeys(
  citeKeys: CiteKey[],
  database: DatabaseWithPort,
  cslStyle?: string,
  format?: string,
  silent?: boolean
) {
  if (!citeKeys || !citeKeys.length) return null;

  let res: string;
  let modal: LoadingModal;
  if (!silent) {
    modal = new LoadingModal(getApp(), 'Fetching data from Zotero...');
    modal.open();
  }

  const qid = Symbol();
  try {
    const params: Record<string, unknown> = {
      quickCopy: true,
      contentType: 'html',
    };

    if (cslStyle) {
      delete params.quickCopy;
      params.id = cslStyle;
    }

    await ZQueue.wait(qid);
    res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.bibliography',
        params: [citeKeys.map((k) => k.key), params, citeKeys[0].library],
      }),
      headers: defaultHeaders,
    });
  } catch (e) {
    console.error(e);
    !silent && modal.close();
    new Notice(`Error retrieving formatted bibliography: ${errorMessage(e)}`, 10000);
    ZQueue.end(qid);
    return null;
  }

  ZQueue.end(qid);
  !silent && modal.close();

  try {
    const parsed = parseRpc(res);
    if (parsed.error?.message) {
      throw new Error(parsed.error.message);
    }
    const html = parsed.result as string;
    return format === 'html' ? html : htmlToMarkdown(html);
  } catch (e) {
    console.error(e);
    console.error(`Response from BBT: ${res}`);

    let message = `Error converting formatted bibliography to markdown: ${errorMessage(e)}`;

    if (errorMessage(e).includes('element/document/fragment')) {
      message = `Error: Received empty bibliography from Zotero. Ensure Zotero's quick copy settings are set and the selected citation style is installed.`;
    }

    new Notice(message, 10000);
    return null;
  }
}

export async function getItemJSONFromCiteKeys(
  citeKeys: CiteKey[],
  database: DatabaseWithPort,
  libraryID: number
) {
  let res: string;

  const modal = new LoadingModal(getApp(), 'Fetching data from Zotero...');
  modal.open();

  const qid = Symbol();
  try {
    await ZQueue.wait(qid);
    res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.export',
        params: [
          citeKeys.map((k) => k.key),
          '36a3b0b5-bad0-4a04-b79b-441c7cef77db',
          libraryID,
        ],
      }),
      headers: defaultHeaders,
    });
  } catch (e) {
    console.error(e);
    modal.close();
    new Notice(`Error retrieving item data: ${errorMessage(e)}`, 10000);
    ZQueue.end(qid);
    return null;
  }

  ZQueue.end(qid);
  modal.close();

  try {
    const parsed = parseRpc(res);
    if (parsed.error?.message) {
      throw new Error(parsed.error.message);
    }

    const payload = Array.isArray(parsed.result)
      ? (parsed.result as string[])[2]
      : (parsed.result as string);

    return (JSON.parse(payload) as { items: ZoteroItemJSON[] }).items;
  } catch (e) {
    console.error(e);
    new Notice(`Error retrieving item data: ${errorMessage(e)}`, 10000);
    return null;
  }
}

export async function getItemJSONFromRelations(
  libraryID: number,
  relations: string[],
  database: DatabaseWithPort
) {
  let res: string;

  const modal = new LoadingModal(getApp(), 'Fetching data from Zotero...');
  modal.open();

  const uriMap: Record<string, string> = {};
  const idOrder: string[] = [];

  const qid = Symbol();
  try {
    await ZQueue.wait(qid);
    res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.citationkey',
        params: [
          relations.map((r) => {
            const id = r.split('/').pop();
            idOrder.push(id);
            uriMap[id] = r;
            return `${libraryID}:${id}`;
          }),
        ],
      }),
      headers: defaultHeaders,
    });
  } catch (e) {
    console.error(e);
    modal.close();
    new Notice(`Error retrieving item data: ${errorMessage(e)}`, 10000);
    ZQueue.end(qid);
    return null;
  }

  ZQueue.end(qid);
  modal.close();

  const idMap: Record<string, ZoteroItemJSON> = {};
  const citekeys: CiteKey[] = [];

  try {
    const result = parseRpc(res).result as Record<string, string>;

    Object.keys(result).forEach((k) => {
      const id = k.split(':').pop() ?? k;
      if (result[k]) {
        citekeys.push({ key: result[k], library: libraryID });
        idMap[id] = { citekey: result[k], uri: uriMap[id] };
      } else {
        idMap[id] = { uri: uriMap[id] };
      }
    });
  } catch (e) {
    console.error(e);
    new Notice(`Error retrieving item data: ${errorMessage(e)}`, 10000);
    return null;
  }

  const items: ZoteroItemJSON[] = citekeys.length
    ? await getItemJSONFromCiteKeys(citekeys, database, libraryID)
    : [];

  return idOrder.map((id) => {
    if (idMap[id].citekey) {
      const item = items.find(
        (item) => getCiteKeyFromAny(item)?.key === idMap[id].citekey
      );

      if (item) {
        return item;
      }
    }

    return idMap[id];
  });
}

export async function getIssueDateFromCiteKey(
  citeKey: CiteKey,
  database: DatabaseWithPort
) {
  let res: string;

  const modal = new LoadingModal(getApp(), 'Fetching data from Zotero...');
  modal.open();

  const qid = Symbol();
  try {
    await ZQueue.wait(qid);
    res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.export',
        params: [
          [citeKey.key],
          'f4b52ab0-f878-4556-85a0-c7aeedd09dfc',
          citeKey.library,
        ],
      }),
      headers: defaultHeaders,
    });
  } catch (e) {
    console.error(e);
    modal.close();
    new Notice(`Error retrieving item data: ${errorMessage(e)}`, 10000);
    ZQueue.end(qid);
    return null;
  }

  ZQueue.end(qid);
  modal.close();

  try {
    const parsed = parseRpc(res);
    if (parsed.error?.message) {
      throw new Error(parsed.error.message);
    }

    const payload = Array.isArray(parsed.result)
      ? (parsed.result as string[])[2]
      : (parsed.result as string);
    const items = JSON.parse(payload) as ZoteroSearchHit[];
    const dates = items
      .map((i: ZoteroSearchHit) => {
        const { issued } = i;
        if (!issued || !issued['date-parts']) return null;

        const dateParts = issued['date-parts'][0] as number[];

        if (!dateParts.length) return null;

        const date = moment(
          `${dateParts[0]}-${dateParts[1] ? padNumber(dateParts[1]) : '01'}-${
            dateParts[2] ? padNumber(dateParts[2]) : '01'
          }`,
          'YYYY-MM-DD'
        );

        return date;
      })
      .filter((d: Moment | null) => d);

    return dates[0] ? dates[0] : null;
  } catch (e) {
    console.error(e);
    new Notice(`Error retrieving item data: ${errorMessage(e)}`, 10000);
    return null;
  }
}

export async function execSearch(term: string, database: DatabaseWithPort) {
  let res: string;
  const qid = Symbol();
  try {
    await ZQueue.wait(qid);
    res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.search',
        params: [term],
      }),
      headers: defaultHeaders,
    });
  } catch (e) {
    console.error(e);
    new Notice(`Error searching: ${errorMessage(e)}`, 10000);
    ZQueue.end(qid);
    return null;
  }

  ZQueue.end(qid);
  try {
    return parseRpc(res).result as ZoteroSearchHit[];
  } catch (e) {
    console.error(e);
    new Notice(`Error searching: ${errorMessage(e)}`, 10000);
    return null;
  }
}

// Items in the user's own library whose title contains `text`. Uses Better
// BibTeX's structured search: its plain-string search builds a condition
// Zotero 9 rejects ("Invalid condition 'groupStart'").
export async function searchByTitle(text: string, database: DatabaseWithPort) {
  const qid = Symbol();
  try {
    await ZQueue.wait(qid);
    const res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'item.search',
        params: [[['ignore_feeds'], ['libraryID', 'is', 1], ['title', 'contains', text]]],
      }),
      headers: defaultHeaders,
    });
    return (parseRpc(res).result as ZoteroSearchHit[] | undefined) ?? null;
  } catch (e) {
    console.error(e);
    return null;
  } finally {
    ZQueue.end(qid);
  }
}

const translatorId = 'f4b52ab0-f878-4556-85a0-c7aeedd09dfc';
export async function getCiteKeyExport(
  database: DatabaseWithPort,
  groupId: string | number,
  groupName: string
) {
  const qid = Symbol();
  try {
    await ZQueue.wait(qid);
    const res = await request({
      method: 'GET',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/export/library?/${groupId}/${groupName}.${translatorId}`,
      headers: defaultHeaders,
    });
    ZQueue.end(qid);

    const entries = JSON.parse(res) as Array<Record<string, string>>;

    return Array.isArray(entries)
      ? entries
          .map((e) => {
            const out: { libraryID: number; citekey?: string; title?: string } = {
              libraryID: Number(groupId),
            };

            if (e['citation-key']) {
              out.citekey = e['citation-key'];
            } else {
              return null;
            }

            if (e['title']) {
              out.title = e['title'];
            } else {
              return null;
            }

            return out as { libraryID: number; citekey: string; title: string };
          })
          .filter((k) => !!k)
      : null;
  } catch {
    ZQueue.end(qid);
    return null;
  }
}

export async function getUserGroups(database: DatabaseWithPort) {
  let res: string;
  const qid = Symbol();
  try {
    await ZQueue.wait(qid);
    res = await request({
      method: 'POST',
      url: `http://127.0.0.1:${getPort(
        database.database,
        database.port
      )}/better-bibtex/json-rpc`,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'user.groups',
        params: [],
      }),
      headers: defaultHeaders,
    });
  } catch (e) {
    console.error(e);
    ZQueue.end(qid);
    return null;
  }
  ZQueue.end(qid);

  try {
    return parseRpc(res).result as ZoteroLibrary[];
  } catch (e) {
    console.error(e);
    return null;
  }
}

let cachedKeys: CiteKeyExport[] = [];
let lastCheck = 0;

export async function getAllCiteKeys(
  database: DatabaseWithPort,
  force?: boolean
) {
  if (!force && cachedKeys.length && Date.now() - lastCheck < 1000 * 60) {
    return { citekeys: cachedKeys, fromCache: true };
  }

  if (!(await isZoteroRunning(database, true))) {
    return { citekeys: cachedKeys, fromCache: true };
  }

  const allKeys: CiteKeyExport[] = [];
  const userGroups = await getUserGroups(database);

  if (!userGroups) {
    return { citekeys: cachedKeys, fromCache: true };
  }

  for (const group of userGroups) {
    const keys = await getCiteKeyExport(database, group.id, group.name);

    if (keys) {
      allKeys.push(...keys);
    }
  }

  cachedKeys = allKeys;
  lastCheck = Date.now();

  return { citekeys: allKeys, fromCache: false };
}
