import Dexie from 'dexie';
import isFunction from 'lodash/isFunction';
import mapValues from 'lodash/mapValues';
import { createLeaderElection } from './leaderElection';
import channel from './broadcastChannel';
import {
  CHANGE_LOCKS_TABLE,
  CHANGE_TYPES,
  CHANGES_TABLE,
  IGNORED_SOURCE,
  TABLE_NAMES,
} from './constants';
import db, { CLIENTID } from './db';
import { INDEXEDDB_RESOURCES } from './registry';
import { startSyncing, stopSyncing } from './serverSync';
import * as resources from './resources';

// Re-export for ease of reference.
export { CHANGE_TYPES, TABLE_NAMES } from './constants';
export { API_RESOURCES, INDEXEDDB_RESOURCES } from './registry';

const LISTENERS = {};

export function setupSchema() {
  if (!Object.keys(resources).length) {
    console.warn('No resources defined!'); // eslint-disable-line no-console
  }

  db.version(1).stores({
    // A special table for logging unsynced changes
    // Dexie.js appears to have a table for this,
    // but it seems to squash and remove changes in ways
    // that I do not currently understand, so we engage
    // in somewhat duplicative behaviour instead.
    [CHANGES_TABLE]: 'rev++,[table+key]',
    // A special table for keeping track of change locks
    [CHANGE_LOCKS_TABLE]: 'id++,tracker_id,expiry',
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

function setupListeners() {
  db.on('changes', function(changes) {
    changes.forEach(function(change) {
      // Don't invoke listeners if their client originated the change
      if (CLIENTID !== change.source) {
        const tableListeners = LISTENERS[change.table];
        if (tableListeners) {
          const changeListeners = tableListeners[change.type];
          if (changeListeners) {
            for (let listener of changeListeners.values()) {
              // Always invoke the callback with the full object representation
              // It is up to the callbacks to know how to parse this.
              const obj = Object.assign(
                { [db[change.table].schema.primKey.keyPath]: change.key },
                change.obj || {}
              );
              listener(obj);
            }
          }
        }
      }
    });
  });
}

function runElection() {
  const elector = createLeaderElection(channel);

  elector.awaitLeadership({
    success: startSyncing,
    cleanup: stopSyncing,
  });
  return elector.waitForLeader();
}

export function initializeDB() {
  setupSchema();
  setupListeners();

  return db.open().then(runElection);
}

export function registerListener(table, change, callback) {
  change = Number(change);
  if (!Object.values(CHANGE_TYPES).includes(change)) {
    throw RangeError(
      `Change must be ${CHANGE_TYPES.CREATED}, ${CHANGE_TYPES.UPDATED}, or ${CHANGE_TYPES.DELETED}`
    );
  }
  if (!isFunction(callback)) {
    throw TypeError('Callback argument must be a function');
  }
  if (!LISTENERS[table]) {
    LISTENERS[table] = {};
  }
  if (!LISTENERS[table][change]) {
    LISTENERS[table][change] = new Map();
  }
  LISTENERS[table][change].set(callback, callback);
}

export function removeListener(table, change, callback) {
  if (LISTENERS[table]) {
    if (LISTENERS[table][change]) {
      return LISTENERS[table][change].delete(callback);
    }
  }
  return false;
}
