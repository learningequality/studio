import debounce from 'lodash/debounce';
import get from 'lodash/get';
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
import urls from 'shared/urls';

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

// Stores last setTimeout in polling so we may clear it when we want
let unsyncedPollingTimeoutId;

// Flag to check if a sync is currently active.
let syncActive = false;

function handleFetchMessages(msg) {
  console.log('******* in handleFetchMessages, msg', msg);
  if (msg.type === MESSAGES.FETCH_COLLECTION && msg.urlName && msg.params) {
    API_RESOURCES[msg.urlName]
      .fetchCollection(msg.params)
      .then(data => {
        console.log('******* in handleFetchMessages, data', data);
        // if (Array.isArray(data)) {
        // console.log('********** AN ARR')
        channel.postMessage({
          messageId: msg.messageId,
          type: MESSAGES.REQUEST_RESPONSE,
          status: STATUS.SUCCESS,
          data,
          // });
          // } else {
          // console.log('******** AN OBJ')
          // let resultsArr = data.results;
          // console.log('******** data.results', resultsArr)
          // channel.postMessage({
          //   messageId: msg.messageId,
          //   type: MESSAGES.REQUEST_RESPONSE,
          //   status: STATUS.SUCCESS,
          //   resultsArr,
        });
        // }
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

function applyResourceListener(change) {
  const resource = INDEXEDDB_RESOURCES[change.table];
  if (resource && resource.listeners && resource.listeners[change.type]) {
    resource.listeners[change.type](change);
  }
}

const commonFields = ['type', 'key', 'table', 'rev'];
const createFields = commonFields.concat(['obj']);
const updateFields = commonFields.concat(['mods']);
const movedFields = commonFields.concat(['target', 'position']);
const copiedFields = commonFields.concat([
  'from_key',
  'mods',
  'target',
  'position',
  'excluded_descendants',
]);

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

  syncActive = true;

  // Track the maxRevision at this moment so that we can ignore any changes that
  // might have come in during processing - leave them for the next cycle.
  // This is the primary key of the change objects, so the collection is ordered by this
  // by default - if we just grab the last object, we can get the key from there.
  return db[CHANGES_TABLE].orderBy('rev')
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
              .sortBy('rev')
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
          ? client.post(urls['sync'](), changes, { timeout: 10 * 1000 })
          : Promise.resolve({});
        // TODO: Log validation errors from the server somewhere for use in the frontend.
        let allErrors = false;
        return syncPromise
          .catch(err => {
            // If all of the changes synced respond with errors,
            // then the backend will respond with a 400 status code
            // in order to do meaningful processing on the errors,
            // we check here first what kind of error was returned
            // if it is a 400, then we can pass the response object
            // to the main handler function in order to process the errors
            const status = get(err, ['response', 'status'], null);
            if (status === 400) {
              const errors = get(err, ['response', 'data', 'errors'], null);
              if (errors) {
                allErrors = true;
                return err.response;
              }
            }
            return Promise.reject(err);
          })
          .then(response => {
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
            const returnedChanges = get(response, ['data', 'changes'], []);
            const errors = get(response, ['data', 'errors'], []);
            // Collect all errors into an errorMap
            const errorMap = {};
            let errorSetPromise = Promise.resolve();
            if (errors.length) {
              for (let error of errors) {
                errorMap[error.rev] = error;
              }
              // Set the return error data onto the changes - this will update the change
              // both with any errors and the results of any merging that happened prior
              // to the sync operation being called
              errorSetPromise = db[CHANGES_TABLE].where('rev')
                .anyOf(Object.keys(errorMap).map(Number))
                .modify(obj => {
                  return Object.assign(obj, errorMap[obj.rev]);
                });
            }
            let changesToDelete;
            if (!allErrors) {
              changesToDelete = db[CHANGES_TABLE].where('rev').belowOrEqual(changesMaxRevision);
              if (errors.length) {
                // Filter changes by whether the revision for this change is in the errorMap
                // merged changes will have been returned from the server whole, so deleting
                // older changes will not be a problem here, as we maintain the merged
                // representation
                changesToDelete = changesToDelete.filter(change => !errorMap[change.rev]);
              }
            }
            const deleteChangesPromise =
              lastChange && !allErrors ? changesToDelete.delete() : Promise.resolve();
            const returnedChangesPromise = returnedChanges.length
              ? applyChanges(returnedChanges)
              : Promise.resolve();
            // Our synchronization was successful,
            // can delete all the changes for this table
            return Promise.all([
              deleteChangesPromise,
              returnedChangesPromise,
              errorSetPromise,
            ]).catch(() => {
              console.error('There was an error deleting changes'); // eslint-disable-line no-console
            });
          })
          .catch(err => {
            // There was an error during syncing, log, but carry on
            console.warn('There was an error during syncing with the backend for', err); // eslint-disable-line no-console
          });
      });
    })
    .then(() => {
      syncActive = false;
    })
    .catch(() => {
      syncActive = false;
    });
}

const debouncedSyncChanges = debounce(() => {
  return hasActiveLocks().then(hasLocks => {
    if (!hasLocks && !syncActive) {
      return syncChanges();
    }
  });
}, SYNC_IF_NO_CHANGES_FOR * 1000);

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  window.forceServerSync = forceServerSync;

  window.stopPollingUnsyncedChanges = stopPollingUnsyncedChanges;
  window.pollUnsyncedChanges = pollUnsyncedChanges;
}

async function handleChanges(changes) {
  changes.map(applyResourceListener);
  const syncableChanges = changes.filter(isSyncableChange);

  const lockChanges = changes.find(
    change => change.table === CHANGE_LOCKS_TABLE && change.type === CHANGE_TYPES.DELETED
  );

  if (syncableChanges.length) {
    // Flatten any changes before we store them in the changes table
    const mergedSyncableChanges = mergeAllChanges(syncableChanges, true).map(change => {
      // Filter out the rev property as we want that to be assigned during the bulkPut
      const { rev, ...filteredChange } = change; // eslint-disable-line no-unused-vars
      return filteredChange;
    });

    await db[CHANGES_TABLE].bulkPut(mergedSyncableChanges);
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
    // Only try to sync if we have at least one change that has
    // not already errored on the backend.
    .filter(c => !c.errors)
    .count();

  // If more than 0, sync the changes
  if (changes > 0) {
    debouncedSyncChanges();
  }
}

async function pollUnsyncedChanges() {
  await checkAndSyncChanges();
  unsyncedPollingTimeoutId = setTimeout(() => pollUnsyncedChanges(), SYNC_IF_NO_CHANGES_FOR * 1000);
}

function stopPollingUnsyncedChanges() {
  if (unsyncedPollingTimeoutId) {
    clearTimeout(unsyncedPollingTimeoutId);
  }
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
  stopPollingUnsyncedChanges();
  // Dexie's slightly counterintuitive method for unsubscribing from events
  db.on('changes').unsubscribe(handleChanges);
}

export function forceServerSync() {
  debouncedSyncChanges();
  return debouncedSyncChanges.flush();
}
