import Dexie from 'dexie';
import * as Sentry from '@sentry/vue';
import mapValues from 'lodash/mapValues';
import channel from './broadcastChannel';
import { CHANGES_TABLE, IGNORED_SOURCE, TABLE_NAMES } from './constants';
import db from './db';
import { INDEXEDDB_RESOURCES } from './registry';
import { startSyncing, stopSyncing } from './serverSync';
import * as resources from './resources';

// Re-export for ease of reference.
export { CHANGE_TYPES, TABLE_NAMES } from './constants';
export { API_RESOURCES, INDEXEDDB_RESOURCES } from './registry';

const { createLeaderElection } = require('broadcast-channel');

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

function runElection() {
  const elector = createLeaderElection(channel);

  elector.awaitLeadership().then(startSyncing);
  elector.onduplicate = () => {
    stopSyncing();
    elector
      .die()
      .then(() => {
        // manually reset reference to dead elector on the channel
        // which is set within `createLeaderElection` and whose
        // presence is also validated against, requiring its removal
        channel._leaderElector = null;
        return runElection();
      })
      .catch(Sentry.captureException);
  };
}

export async function initializeDB() {
  try {
    setupSchema();
    await db.open();
    await runElection();
  } catch (e) {
    Sentry.captureException(e);
  }
}
