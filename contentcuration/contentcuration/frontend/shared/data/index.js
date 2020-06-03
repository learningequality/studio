import isFunction from 'lodash/isFunction';
import mapValues from 'lodash/mapValues';
import { createLeaderElection } from './leaderElection';
import channel from './broadcastChannel';
import { CHANGE_LOCKS_TABLE, CHANGE_TYPES, CHANGES_TABLE, TREE_CHANGES_TABLE } from './constants';
import db, { CLIENTID } from './db';
import { INDEXEDDB_RESOURCES } from './resources';
import { startSyncing, stopSyncing } from './serverSync';

// Re-export for ease of reference.
export { CHANGE_TYPES } from './constants';
export { TABLE_NAMES, API_RESOURCES, INDEXEDDB_RESOURCES } from './resources';

const LISTENERS = {};

export function setupSchema() {
  db.version(1).stores({
    // A special table for logging unsynced changes
    // Dexie.js appears to have a table for this,
    // but it seems to squash and remove changes in ways
    // that I do not currently understand, so we engage
    // in somewhat duplicative behaviour instead.
    [CHANGES_TABLE]: 'rev++',
    // A special special table for logging tree changes in
    // the ContentNode table - do this completely separately
    // as we don't want to merge move changes with non-move
    [TREE_CHANGES_TABLE]: 'rev++',
    // A special table for keeping track of change locks
    [CHANGE_LOCKS_TABLE]: 'id++,tracker_id,expiry',
    ...mapValues(INDEXEDDB_RESOURCES, value => value.schema),
  });
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
                change.oldObj || {},
                change.mods || {},
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

  return runElection().then(db.open);
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
