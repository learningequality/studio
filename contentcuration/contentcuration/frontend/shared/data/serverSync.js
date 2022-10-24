import debounce from 'lodash/debounce';
import findLastIndex from 'lodash/findLastIndex';
import get from 'lodash/get';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import orderBy from 'lodash/orderBy';
import uniq from 'lodash/uniq';
import applyChanges from './applyRemoteChanges';
import {
  CHANGE_TYPES,
  CHANGES_TABLE,
  IGNORED_SOURCE,
  CHANNEL_SYNC_KEEP_ALIVE_INTERVAL,
  ACTIVE_CHANNELS,
  MAX_REV_KEY,
  LAST_FETCHED,
  COPYING_FLAG,
  TASK_ID,
} from './constants';
import db from './db';
import mergeAllChanges from './mergeChanges';
import { INDEXEDDB_RESOURCES } from './registry';
import { Channel, Session, Task } from './resources';
import client from 'shared/client';
import urls from 'shared/urls';

// When this many seconds pass without a syncable
// change being registered, sync changes!
const SYNC_IF_NO_CHANGES_FOR = 2;

// When this many seconds pass, repoll the backend to
// check for any updates to active channels, or the user and sync any current changes
const SYNC_POLL_INTERVAL = 5;

// Flag to check if a sync is currently active.
let syncActive = false;

const commonFields = ['type', 'key', 'table', 'rev', 'channel_id', 'user_id'];
const objectFields = ['objs', 'mods'];
const ignoredSubFields = [COPYING_FLAG, LAST_FETCHED, TASK_ID];

const ChangeTypeMapFields = {
  [CHANGE_TYPES.CREATED]: commonFields.concat(['obj']),
  [CHANGE_TYPES.UPDATED]: commonFields.concat(['mods']),
  [CHANGE_TYPES.DELETED]: commonFields,
  [CHANGE_TYPES.MOVED]: commonFields.concat(['target', 'position']),
  [CHANGE_TYPES.COPIED]: commonFields.concat([
    'from_key',
    'mods',
    'target',
    'position',
    'excluded_descendants',
  ]),
  [CHANGE_TYPES.PUBLISHED]: commonFields.concat(['version_notes', 'language']),
  [CHANGE_TYPES.SYNCED]: commonFields.concat(['attributes', 'tags', 'files', 'assessment_items']),
};

function isSyncableChange(change) {
  const src = change.source || '';

  return (
    !src.match(IGNORED_SOURCE) &&
    INDEXEDDB_RESOURCES[change.table] &&
    INDEXEDDB_RESOURCES[change.table].syncable &&
    // don't create changes when it's an update to only ignored fields
    (change.type !== CHANGE_TYPES.UPDATED ||
      Object.keys(change.mods).some(key => !ignoredSubFields.includes(key)))
  );
}

function applyResourceListener(change) {
  const resource = INDEXEDDB_RESOURCES[change.table];
  if (resource && resource.listeners && resource.listeners[change.type]) {
    resource.listeners[change.type](change);
  }
}

/**
 * Reduces a change to only the fields that are needed for sending it to the backend
 *
 * @param change
 * @return {null|Object}
 */
function trimChangeForSync(change) {
  // Extract the syncable fields
  const payload = pick(change, ChangeTypeMapFields[change.type]);

  // for any field that has an object as a value, remove ignored fields from those objects
  for (let field of objectFields) {
    if (payload[field]) {
      payload[field] = omit(payload[field], ignoredSubFields);
    }
  }
  return payload;
}

function handleDisallowed(response) {
  // The disallowed property is an array of any changes that were sent to the server,
  // that were rejected.
  const disallowed = get(response, ['data', 'disallowed'], []);
  if (disallowed.length) {
    // Collect all disallowed
    const disallowedRevs = disallowed.map(d => Number(d.rev));
    // Set the return error data onto the changes - this will update the change
    // both with any errors and the results of any merging that happened prior
    // to the sync operation being called
    return db[CHANGES_TABLE].where('rev')
      .anyOf(disallowedRevs)
      .modify({ disallowed: true, synced: true });
  }
  return Promise.resolve();
}

function handleAllowed(response) {
  // The allowed property is an array of any rev and server_rev for any changes sent to
  // the server that were accepted
  const allowed = get(response, ['data', 'allowed'], []);
  if (allowed.length) {
    const revMap = {};
    for (let obj of allowed) {
      revMap[obj.rev] = obj.server_rev;
    }
    return db[CHANGES_TABLE].where('rev')
      .anyOf(Object.keys(revMap).map(Number))
      .modify(c => {
        c.server_rev = revMap[c.rev];
        c.synced = true;
      });
  }
  return Promise.resolve();
}

function handleReturnedChanges(response) {
  // The changes property is an array of any changes from the server to apply in the
  // client.
  const returnedChanges = get(response, ['data', 'changes'], []);
  if (returnedChanges.length) {
    return applyChanges(returnedChanges);
  }
  return Promise.resolve();
}

function handleErrors(response) {
  // The errors property is an array of any changes that were sent to the server,
  // that were rejected, with an additional errors property that describes
  // the error.
  const errors = get(response, ['data', 'errors'], []);
  if (errors.length) {
    const errorMap = {};
    for (let error of errors) {
      errorMap[error.server_rev] = error;
    }
    // Set the return error data onto the changes - this will update the change
    // both with any errors and the results of any merging that happened prior
    // to the sync operation being called
    return db[CHANGES_TABLE].where('server_rev')
      .anyOf(Object.keys(errorMap).map(Number))
      .modify(obj => {
        return Object.assign(obj, errorMap[obj.server_rev]);
      });
  }
  return Promise.resolve();
}

function handleSuccesses(response) {
  // The successes property is an array of server_revs for any previously synced changes
  // that have now been successfully applied on the server.
  const successes = get(response, ['data', 'successes'], []);
  if (successes.length) {
    return db[CHANGES_TABLE].where('server_rev')
      .anyOf(successes.map(c => c.server_rev))
      .delete();
  }
  return Promise.resolve();
}

function handleMaxRevs(response, userId) {
  const allChanges = orderBy(
    get(response, ['data', 'changes'], [])
      .concat(get(response, ['data', 'errors'], []))
      .concat(get(response, ['data', 'successes'], [])),
    'server_rev',
    'desc'
  );
  const channelIds = uniq(allChanges.map(c => c.channel_id)).filter(Boolean);
  const maxRevs = {};
  const promises = [];
  for (let channelId of channelIds) {
    const channelChanges = allChanges.filter(c => c.channel_id === channelId);
    maxRevs[`${MAX_REV_KEY}.${channelId}`] = channelChanges[0].server_rev;
    const lastChannelEditIndex = findLastIndex(
      channelChanges,
      c => !c.errors && !c.user_id && c.created_by_id && c.type !== CHANGE_TYPES.PUBLISHED
    );
    const lastPublishIndex = findLastIndex(
      channelChanges,
      c => !c.errors && !c.user_id && c.created_by_id && c.type === CHANGE_TYPES.PUBLISHED
    );
    if (lastChannelEditIndex > lastPublishIndex) {
      promises.push(
        Channel.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
          return Channel.table.update(channelId, { unpublished_changes: true });
        })
      );
    }
  }
  const lastUserChange = allChanges.find(c => c.user_id === userId);
  if (lastUserChange) {
    maxRevs.user_rev = lastUserChange.server_rev;
  }
  if (Object.keys(maxRevs).length) {
    promises.push(Session.updateSession(maxRevs));
  }
  return Promise.all(promises);
}

function handleTasks(response) {
  const tasks = get(response, ['data', 'tasks'], []);
  return Task.setTasks(tasks);
}

async function syncChanges() {
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
  const [lastChange, user] = await Promise.all([
    db[CHANGES_TABLE].orderBy('rev').last(),
    Session.getSession(),
  ]);
  if (!user) {
    // If not logged in, nothing to do.
    return;
  }

  const now = Date.now();
  const channelIds = Object.entries(user[ACTIVE_CHANNELS] || {})
    .filter(([id, time]) => id && time > now - CHANNEL_SYNC_KEEP_ALIVE_INTERVAL)
    .map(([id]) => id);
  const channel_revs = {};
  for (let channelId of channelIds) {
    channel_revs[channelId] = get(user, [MAX_REV_KEY, channelId], 0);
  }

  const requestPayload = {
    changes: [],
    channel_revs,
    user_rev: user.user_rev || 0,
  };

  if (lastChange) {
    const changesMaxRevision = lastChange.rev;
    const syncableChanges = db[CHANGES_TABLE].where('rev')
      .belowOrEqual(changesMaxRevision)
      .filter(c => !c.synced);
    const changesToSync = await syncableChanges.toArray();
    // By the time we get here, our changesToSync Array should
    // have every change we want to sync to the server, so we
    // can now trim it down to only what is needed to transmit over the wire.
    // TODO: remove moves when a delete change is present for an object,
    // because a delete will wipe out the move.
    const changes = changesToSync.map(trimChangeForSync).filter(Boolean);
    // Create a promise for the sync - if there is nothing to sync just resolve immediately,
    // in order to still call our change cleanup code.
    if (changes.length) {
      requestPayload.changes = changes;
    }
  }
  try {
    // The response from the sync endpoint has the format:
    // {
    //   "disallowed": [],
    //   "allowed": [],
    //   "changes": [],
    //   "errors": [],
    //   "successes": [],
    // }
    const response = await client.post(urls['sync'](), requestPayload);
    try {
      await Promise.all([
        handleDisallowed(response),
        handleAllowed(response),
        handleReturnedChanges(response),
        handleErrors(response),
        handleSuccesses(response),
        handleMaxRevs(response, user.id),
        handleTasks(response),
      ]);
    } catch (err) {
      console.error('There was an error updating change status: ', err); // eslint-disable-line no-console
    }
  } catch (err) {
    // There was an error during syncing, log, but carry on
    console.warn('There was an error during syncing with the backend: ', err); // eslint-disable-line no-console
  }
  syncActive = false;
}

const debouncedSyncChanges = debounce(() => {
  if (!syncActive) {
    return syncChanges();
  }
}, SYNC_IF_NO_CHANGES_FOR * 1000);

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  window.forceServerSync = forceServerSync;
}

async function handleChanges(changes) {
  changes.map(applyResourceListener);
  const syncableChanges = changes.filter(isSyncableChange);
  // Here we are handling changes triggered by Dexie Observable
  // this is listening to all of our IndexedDB tables, both for resources
  // and for our special Changes table.
  // Here we look for any newly created changes in the changes table, which may require
  // a sync to send them to the backend - this is particularly important for
  // MOVE, COPY, PUBLISH, and SYNC changes where we may be executing them inside an IGNORED_SOURCE
  // because they also make UPDATE and CREATE changes that we wish to make in the client only.
  // Only do this for changes that are not marked as synced.
  const newChangeTableEntries = changes.some(
    c => c.table === CHANGES_TABLE && c.type === CHANGE_TYPES.CREATED && !c.obj.synced
  );

  if (syncableChanges.length) {
    // Flatten any changes before we store them in the changes table
    const mergedSyncableChanges = mergeAllChanges(syncableChanges, true).map(change => {
      // Filter out the rev property as we want that to be assigned during the bulkPut
      const { rev, ...filteredChange } = change; // eslint-disable-line no-unused-vars
      // Set appropriate contextual information on changes, channel_id and user_id
      INDEXEDDB_RESOURCES[change.table].setChannelIdOnChange(filteredChange);
      INDEXEDDB_RESOURCES[change.table].setUserIdOnChange(filteredChange);
      return filteredChange;
    });

    await db[CHANGES_TABLE].bulkPut(mergedSyncableChanges);
  }

  // If we detect  changes were written to the changes table
  // then we'll trigger sync
  if (syncableChanges.length || newChangeTableEntries) {
    debouncedSyncChanges();
  }
}

let intervalTimer;

export function startSyncing() {
  // Initiate a sync immediately in case any data
  // is left over in the database.
  debouncedSyncChanges();
  // Start the sync interval
  intervalTimer = setInterval(debouncedSyncChanges, SYNC_POLL_INTERVAL * 1000);
  db.on('changes', handleChanges);
}

export function stopSyncing() {
  clearInterval(intervalTimer);
  debouncedSyncChanges.cancel();
  // Dexie's slightly counterintuitive method for unsubscribing from events
  db.on('changes').unsubscribe(handleChanges);
}

export function forceServerSync() {
  debouncedSyncChanges();
  return debouncedSyncChanges.flush();
}
