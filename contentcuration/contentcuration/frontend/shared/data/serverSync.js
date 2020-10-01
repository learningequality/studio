import debounce from 'lodash/debounce';
import matches from 'lodash/matches';
import pick from 'lodash/pick';
import applyChanges from './applyRemoteChanges';
import { createChannel } from './broadcastChannel';
import { hasActiveLocks, cleanupLocks } from './changes';
import {
  CHANGE_LOCKS_TABLE,
  CHANGE_TYPES,
  CHANGES_TABLE,
  IGNORED_SOURCE,
  MESSAGES,
  STATUS,
} from './constants';
import db from './db';
import mergeAllChanges from './mergeChanges';
import { API_RESOURCES, INDEXEDDB_RESOURCES } from './registry';
import client from 'shared/client';

// Number of changes to process at once
const SYNC_BUFFER = 1000;

// When this many seconds pass without a syncable
// change being registered, sync changes!
const SYNC_IF_NO_CHANGES_FOR = 2;

// In order to listen to messages being sent
// by all windows, including this one, for requests
// to fetch collections or models, we have to create
// a new channel instance, rather than using the one
// already instantiated in the broadcastChannel module.
const channel = createChannel();

function handleFetchMessages(msg) {
  if (msg.type === MESSAGES.FETCH_COLLECTION && msg.urlName && msg.params) {
    API_RESOURCES[msg.urlName]
      .fetchCollection(msg.params)
      .then(data => {
        channel.postMessage({
          messageId: msg.messageId,
          type: MESSAGES.REQUEST_RESPONSE,
          status: STATUS.SUCCESS,
          data,
        });
      })
      .catch(err => {
        try {
          JSON.stringify(err);
        } catch (e) {
          // If can't convert err to JSON, postMessage will break
          err = err.toString();
        }
        channel.postMessage({
          messageId: msg.messageId,
          type: MESSAGES.REQUEST_RESPONSE,
          status: STATUS.FAILURE,
          err,
        });
      });
  }
  if (msg.type === MESSAGES.FETCH_MODEL && msg.urlName && msg.id) {
    API_RESOURCES[msg.urlName]
      .fetchModel(msg.id)
      .then(data => {
        channel.postMessage({
          messageId: msg.messageId,
          type: MESSAGES.REQUEST_RESPONSE,
          status: STATUS.SUCCESS,
          data,
        });
      })
      .catch(err => {
        channel.postMessage({
          messageId: msg.messageId,
          type: MESSAGES.REQUEST_RESPONSE,
          status: STATUS.FAILURE,
          err,
        });
      });
  }
}

function startChannelFetchListener() {
  channel.addEventListener('message', handleFetchMessages);
}

function stopChannelFetchListener() {
  channel.removeEventListener('message', handleFetchMessages);
}

function isSyncableChange(change) {
  const src = change.source || '';

  return (
    !src.match(IGNORED_SOURCE) &&
    INDEXEDDB_RESOURCES[change.table] &&
    INDEXEDDB_RESOURCES[change.table].syncable
  );
}

const commonFields = ['type', 'key', 'table', 'rev'];
const createFields = commonFields.concat(['obj']);
const updateFields = commonFields.concat(['mods']);
const movedFields = commonFields.concat(['mods']);
const copiedFields = commonFields.concat(['from_key', 'mods']);
const relationFields = commonFields.concat(['obj']);

function trimChangeForSync(change) {
  if (change.type === CHANGE_TYPES.CREATED) {
    return pick(change, createFields);
  } else if (change.type === CHANGE_TYPES.UPDATED) {
    return pick(change, updateFields);
  } else if (change.type === CHANGE_TYPES.DELETED) {
    return pick(change, commonFields);
  } else if (change.type === CHANGE_TYPES.MOVED) {
    return pick(change, movedFields);
  } else if (change.type === CHANGE_TYPES.COPIED) {
    return pick(change, copiedFields);
  } else if (
    change.type === CHANGE_TYPES.CREATED_RELATION ||
    change.type === CHANGE_TYPES.DELETED_RELATION
  ) {
    return pick(change, relationFields);
  }
}

function syncChanges() {
  // Note: we could in theory use Dexie syncable for what
  // we are doing here, but I can't find a good way to make
  // it ignore our regular API calls for seeding the database
  // Also, the pattern it expects for server interactions would
  // require greater backend rearchitecting to focus our server-client
  // interactions on changes to objects, with consistent and resolvable
  // revisions. We will do this for now, but we have the option of doing
  // something more involved and better architectured in the future.

  // Track the maxRevision at this moment so that we can ignore any changes that
  // might have come in during processing - leave them for the next cycle.
  // This is the primary key of the change objects, so the collection is ordered by this
  // by default - if we just grab the last object, we can get the key from there.
  return db[CHANGES_TABLE].toCollection()
    .last()
    .then(lastChange => {
      let changesPromise = Promise.resolve([]);
      let changesMaxRevision;
      if (lastChange) {
        changesMaxRevision = lastChange.rev;
        const syncableChanges = db[CHANGES_TABLE].where('rev').belowOrEqual(changesMaxRevision);
        changesPromise = syncableChanges.count(count => {
          let i = 0;
          function processNextChunk(changesToSync) {
            // If our starting point plus the SYNC_BUFFER value
            // is greater than or equal to the count, then this
            // is our final recursion through.
            const finalRecursion = i + SYNC_BUFFER >= count;
            return syncableChanges
              .offset(i)
              .limit(SYNC_BUFFER)
              .toArray()
              .then(changes => {
                // Continue to merge on to the existing changes we have merged
                changesToSync = mergeAllChanges(changes, finalRecursion, changesToSync);
                // Check that we have not got all of the records in this last pass
                if (!finalRecursion) {
                  // We've handled all the changes in this chunk,
                  // so now let's increment and do the next one.
                  i += SYNC_BUFFER;
                  return processNextChunk(changesToSync);
                } else {
                  return changesToSync;
                }
              });
          }
          return processNextChunk();
        });
      }
      return changesPromise.then(changesToSync => {
        // By the time we get here, our changesToSync Array should
        // have every change we want to sync to the server, so we
        // can now trim it down to only what is needed to transmit over the wire.
        // TODO: remove moves when a delete change is present for an object,
        // because a delete will wipe out the move.
        const changes = changesToSync.map(trimChangeForSync);
        // Create a promise for the sync - if there is nothing to sync just resolve immediately,
        // in order to still call our change cleanup code.
        const syncPromise = changes.length
          ? client.post(window.Urls['sync'](), changes, { timeout: 10 * 1000 })
          : Promise.resolve({});
        // TODO: Log validation errors from the server somewhere for use in the frontend.
        return syncPromise
          .then(response => {
            let changesToDelete = db[CHANGES_TABLE].where('rev').belowOrEqual(changesMaxRevision);
            // The response from the sync endpoint has the format:
            // {
            //    "changes": [],
            //    "errors": [],
            // }
            // The changes property is an array of any changes from the server to apply in the
            // client.
            // The errors property is an array of any changes that were sent to the server,
            // that were rejected, with an additional errors property that describes
            // the error.
            const returnedChanges =
              response.data && response.data.changes ? response.data.changes : [];
            const errors = response.data && response.data.errors ? response.data.errors : [];
            if (errors.length) {
              // Keep all changes that are related to this key/table pair,
              // so that they can be reaggregated later.
              // Create a match function for each rejected change to use for filtering.
              const rejectedChangesMatchFunctions = errors.map(change =>
                matches(pick(change, ['key', 'table']))
              );
              changesToDelete = changesToDelete.filter(
                change => !rejectedChangesMatchFunctions.some(fn => fn(change))
              );
            }
            const deleteChangesPromise = lastChange ? changesToDelete.delete() : Promise.resolve();
            const returnedChangesPromise = returnedChanges.length
              ? applyChanges(returnedChanges)
              : Promise.resolve();
            // Our synchronization was successful,
            // can delete all the changes for this table
            return Promise.all([deleteChangesPromise, returnedChangesPromise]).catch(() => {
              console.error('There was an error deleting changes'); // eslint-disable-line no-console
            });
          })
          .catch(err => {
            // There was an error during syncing, log, but carry on
            console.warn('There was an error during syncing with the backend for', err); // eslint-disable-line no-console
          });
      });
    });
}

const debouncedSyncChanges = debounce(() => {
  return hasActiveLocks().then(hasLocks => {
    if (!hasLocks) {
      return syncChanges();
    }
  });
}, SYNC_IF_NO_CHANGES_FOR * 1000);

if (process.env.NODE_ENV !== 'production') {
  window.forceServerSync = function() {
    debouncedSyncChanges();
    debouncedSyncChanges.flush();
  };
}

function handleChanges(changes) {
  const syncableChanges = changes.filter(isSyncableChange).map(change => {
    // Filter out the rev property as we want that to be assigned during the bulkPut
    const { rev, ...filteredChange } = change; // eslint-disable-line no-unused-vars
    return filteredChange;
  });

  const lockChanges = changes.find(
    change => change.table === CHANGE_LOCKS_TABLE && change.type === CHANGE_TYPES.DELETED
  );

  if (syncableChanges.length) {
    // Flatten any changes before we store them in the changes table
    db[CHANGES_TABLE].bulkPut(mergeAllChanges(syncableChanges, true));
  }

  // If we detect locks were removed, or changes were written to the changes table
  // then we'll trigger sync
  if (lockChanges || syncableChanges.length) {
    debouncedSyncChanges();
  }
}

async function checkAndSyncChanges() {
  // Get count of changes that we care about
  const changes = await db[CHANGES_TABLE].toCollection()
    .filter(f => f.type !== CHANGE_TYPES.DELETED)
    .count();

  // If more than 0, sync the changes
  if (changes > 0) {
    debouncedSyncChanges();
  }
}

async function pollUnsyncedChanges(keepPolling = null) {
  // A fn so we can reliably add and remove it as a listener
  const pollStopper = () => (keepPolling = false);

  // Deliberately set as null to be the first time we call this fn
  if (keepPolling === null) {
    window.addEventListener('stopPollingUnsyncedChanges', pollStopper);
  }

  // If keepPolling is false, then we got that way because of the listener above
  // so we can just remove the event listener and bail
  if (keepPolling === false) {
    window.removeEventListener('stopPollingUnsyncedChanges', pollStopper);
    return;
  }

  // Check for changes and sync them if they're there.
  await checkAndSyncChanges();

  // Now - if keepPolling is false then it'll remove the event listener
  // If it's true, then it checks again altogether.
  setTimeout(() => pollUnsyncedChanges(keepPolling), SYNC_IF_NO_CHANGES_FOR * 1000);
}

export function startSyncing() {
  startChannelFetchListener();
  cleanupLocks();
  // Initiate a sync immediately in case any data
  // is left over in the database.
  debouncedSyncChanges();
  // Begin polling our CHANGES_TABLE
  pollUnsyncedChanges();
  db.on('changes', handleChanges);
}

export function stopSyncing() {
  stopChannelFetchListener();
  debouncedSyncChanges.cancel();
  // Stop pollUnsyncedChanges
  window.dispatchEvent(new Event('stopPollingUnsyncedChanges'));
  // Dexie's slightly counterintuitive method for unsubscribing from events
  db.on('changes').unsubscribe(handleChanges);
}
