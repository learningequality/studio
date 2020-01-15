import debounce from 'lodash/debounce';
import flatMap from 'lodash/flatMap';
import pick from 'lodash/pick';
import { createChannel } from './broadcastChannel';
import { CHANGE_TYPES, CHANGES_TABLE, FETCH_SOURCE, MESSAGES, STATUS } from './constants';
import db from './db';
import mergeChanges from './mergeChanges';
import RESOURCES from './resources';
import client from 'shared/client';

// Number of changes to process at once
const SYNC_BUFFER = 1000;

// When this many seconds pass without a syncable
// change being registered, sync changes!
const SYNC_IF_NO_CHANGES_FOR = 10;

// In order to listen to messages being sent
// by all windows, including this one, for requests
// to fetch collections or models, we have to create
// a new channel instance, rather than using the one
// already instantiated in the broadcastChannel module.
const channel = createChannel();

function startChannelFetchListener() {
  channel.addEventListener('message', function(msg) {
    if (msg.type === MESSAGES.FETCH_COLLECTION && msg.tableName && msg.params) {
      RESOURCES[msg.tableName].fetchCollection(msg.params).then(data => {
        channel.postMessage({
          messageId: msg.messageId,
          type: MESSAGES.REQUEST_RESPONSE,
          status: STATUS.SUCCESS,
          data,
        })
      }).catch(err => {
        channel.postMessage({
          messageId: msg.messageId,
          type: MESSAGES.REQUEST_RESPONSE,
          status: STATUS.FAILURE,
          err,
        })
      });
    }
    if (msg.type === MESSAGES.FETCH_MODEL && msg.tableName && msg.id) {
      RESOURCES[msg.tableName].fetchModel(msg.id).then(data => {
        channel.postMessage({
          messageId: msg.messageId,
          type: MESSAGES.REQUEST_RESPONSE,
          status: STATUS.SUCCESS,
          data,
        })
      }).catch(err => {
        channel.postMessage({
          messageId: msg.messageId,
          type: MESSAGES.REQUEST_RESPONSE,
          status: STATUS.FAILURE,
          err,
        })
      });
    }
  });
}

function isSyncableChange(change) {
  return change.source !== FETCH_SOURCE && RESOURCES[change.table]
}

const commonFields = ['type', 'key', 'table'];
const createFields = commonFields.concat(['obj']);
const updateFields = commonFields.concat(['mods']);

function trimChangeForSync(change) {
  if (change.type === CHANGE_TYPES.CREATED) {
    return pick(change, createFields);
  } else if (change.type === CHANGE_TYPES.UPDATED) {
    return pick(change, updateFields);
  } else if (change.type === CHANGE_TYPES.DELETED) {
    return pick(change, commonFields);
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

  // Filter out any changes that are the result of fetching from the server,
  // no need to sync these.
  const discardChanges = db[CHANGES_TABLE].toCollection().filter(
    change => change.source === FETCH_SOURCE);
  // Delete all these changes as cleanup
  discardChanges.delete();
  // Create an empty object with blank entries for every RESOURCE table.
  const changesToSync = Object.fromEntries(Object.keys(RESOURCES).map(key => [key, {}]));
  // Track the maxRevision at this moment so that we can ignore any changes that
  // might have come in during processing - leave them for the next cycle.
  // This is the primary key of the change objects, so the collection is ordered by this
  // by default - if we just grab the last object, we can get the key from there.
  return db[CHANGES_TABLE].toCollection().last(lastChange => {
    if (lastChange) {
      const maxRevision = lastChange.rev;
      const syncableChanges = db[CHANGES_TABLE].where('rev').belowOrEqual(maxRevision);
      return syncableChanges.count(count => {
        let i = 0;
        function processNextChunk() {
          return syncableChanges.offset(i).limit(SYNC_BUFFER).toArray().then(changes => {
            changes.forEach(change => {
              // Ignore changes initiated by our fetching logic putting
              // or updating objects in the DB, or by non-Resource registered tables
              if (isSyncableChange(change)) {
                if (!changesToSync[change.table][change.key]) {
                  // If we have no changes for this object already, just put this straight in
                  changesToSync[change.table][change.key] = change;
                } else {
                  // Otherwise we need to reconcile the changes.
                  const updatedChange = mergeChanges(
                    changesToSync[change.table][change.key],
                    change
                  );
                  if (updatedChange) {
                    changesToSync[change.table][change.key] = updatedChange;
                  } else {
                    // If the mergeChanges function returned a null value,
                    // means we should delete the change entirely.
                    delete changesToSync[change.table][change.key];
                  }
                }
              }
            });
            // We've handled all the changes in this chunk,
            // so now let's increment and do the next one.
            i += SYNC_BUFFER;
            if (i < count) {
              return processNextChunk();
            } else {
              return;
            }
          });
        }
        return processNextChunk().then(() => {
          // By the time we get here, our changesToSync object should
          // have every change we want to sync to the server, so we
          // can now do that resource by resource.
          const changes = flatMap(changesToSync, obj => Object.values(obj).map(trimChangeForSync));
          return client.post(window.Urls['sync'](), changes).then(response => {
            if (!response) {
              return;
            }
            // Our synchronization was successful,
            // can delete all the changes for this table
            return syncableChanges.delete().catch(() => {
              console.error('There was an error deleting changes'); // eslint-disable-line no-console
            });
          }).catch(err => {
            // There was an error during syncing, log, but carry on
            console.warn('There was an error during syncing with the backend for', err);  // eslint-disable-line no-console
          });
        });
      });
    }
  });
}

const debouncedSyncChanges = debounce(syncChanges, SYNC_IF_NO_CHANGES_FOR * 1000);

export default function startSyncing() {
  startChannelFetchListener();
  db.on('changes', function (changes) {
    const syncableChanges = changes.filter(isSyncableChange);
    if (syncableChanges.length) {
      db[CHANGES_TABLE].bulkPut(syncableChanges).then(() => {
        debouncedSyncChanges();
      });
    }
  });
}
