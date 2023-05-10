import Dexie from 'dexie';
import * as Sentry from '@sentry/vue';
import mapValues from 'lodash/mapValues';
import { CHANGES_TABLE, IGNORED_SOURCE, TABLE_NAMES } from './constants';
import db from './db';
import { INDEXEDDB_RESOURCES } from './registry';
import { startSyncing, stopSyncing } from './serverSync';
import * as resources from './resources';

// Re-export for ease of reference.
export { CHANGE_TYPES, TABLE_NAMES } from './constants';
export { API_RESOURCES, INDEXEDDB_RESOURCES } from './registry';

export function setupSchema() {
  if (!Object.keys(resources).length) {
    console.warn('No resources defined!'); // eslint-disable-line no-console
  }
  // Version incremented to 2 to add Bookmark table and new index on CHANGES_TABLE.
  db.version(2).stores({
    // A special table for logging unsynced changes
    // Dexie.js appears to have a table for this,
    // but it seems to squash and remove changes in ways
    // that I do not currently understand, so we engage
    // in somewhat duplicative behaviour instead.
    [CHANGES_TABLE]: 'rev++,[table+key],server_rev',
    ...mapValues(INDEXEDDB_RESOURCES, value => value.schema),
  });
}

export function resetDB() {
  const tableNames = Object.values(TABLE_NAMES);
  return db.transaction('rw', ...tableNames, () => {
    Dexie.currentTransaction.source = IGNORED_SOURCE;
    return Promise.all(tableNames.map(table => db[table].clear()));
  });
}

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  window.resetDB = resetDB;
}

function applyResourceListener(change) {
  const resource = INDEXEDDB_RESOURCES[change.table];
  if (resource && resource.listeners && resource.listeners[change.type]) {
    resource.listeners[change.type](change);
  }
}

export async function initializeDB() {
  try {
    setupSchema();
    await db.open();
    db.on('changes', changes => changes.map(applyResourceListener));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopSyncing();
      } else {
        startSyncing();
      }
    });
    if (!document.hidden) {
      startSyncing();
    }
  } catch (e) {
    Sentry.captureException(e);
  }
}
