import Vue from 'vue';
import findLastIndex from 'lodash/findLastIndex';
import get from 'lodash/get';
import pick from 'lodash/pick';
import orderBy from 'lodash/orderBy';
import uniq from 'lodash/uniq';
import logging from '../logging';
import { changeStream } from './applyRemoteChanges';
import { acquireLock } from './locks';
import { changeRevs } from './registry';
import { CHANGE_TYPES, CHANGES_TABLE, MAX_REV_KEY, LOCK_NAMES } from './constants';
import db, { channelScope } from './db';
import { Channel, Session, Task } from './resources';
import client from 'shared/client';
import urls from 'shared/urls';

// When this many seconds pass without a syncable
// change being registered, sync changes!
const SYNC_IF_NO_CHANGES_FOR = 2;

// When this many seconds pass, repoll the backend to
// check for any updates to active channels, or the user and sync any current changes
const SYNC_POLL_INTERVAL = 5;

const commonFields = ['type', 'key', 'table', 'rev', 'channel_id', 'user_id'];
const ChangeTypeMapFields = {
  [CHANGE_TYPES.CREATED]: commonFields.concat(['obj']),
  [CHANGE_TYPES.UPDATED]: commonFields.concat(['mods']),
  [CHANGE_TYPES.DELETED]: commonFields.concat(['oldObj']),
  [CHANGE_TYPES.MOVED]: commonFields.concat(['target', 'position', 'oldObj', 'parent']),
  [CHANGE_TYPES.COPIED]: commonFields.concat([
    'from_key',
    'mods',
    'target',
    'position',
    'excluded_descendants',
  ]),
  [CHANGE_TYPES.PUBLISHED]: commonFields.concat(['version_notes', 'language']),
  [CHANGE_TYPES.PUBLISHED_NEXT]: commonFields.concat(['use_staging_tree', 'version_notes', 'language']),
  [CHANGE_TYPES.SYNCED]: commonFields.concat([
    'titles_and_descriptions',
    'resource_details',
    'files',
    'assessment_items',
  ]),
  [CHANGE_TYPES.DEPLOYED]: commonFields,
  [CHANGE_TYPES.UPDATED_DESCENDANTS]: commonFields.concat(['mods']),
};

/**
 * Reduces a change to only the fields that are needed for sending it to the backend
 *
 * @param change
 * @return {null|Object}
 */
function trimChangeForSync(change) {
  // Extract the syncable fields
  return pick(change, ChangeTypeMapFields[change.type]);
}

function handleDisallowed(response) {
  // The disallowed property is an array of any changes that were sent to the server,
  // that were rejected.
  const disallowed = get(response, ['data', 'disallowed'], []);
  if (disallowed.length) {
    // Capture occurrences of the api disallowing changes
    logging.error(new Error('/api/sync returned disallowed changes'), {
      filename: 'disallowed.json',
      data: JSON.stringify(disallowed),
      contentType: 'application/json',
    });

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
    for (const obj of allowed) {
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
    return changeStream.write(returnedChanges);
  }
  return Promise.resolve();
}

// These are keys that the changes table is indexed by, so we cannot modify these during
// the modify call that we use to update the changes table, if they already exist.
const noModifyKeys = {
  server_rev: true,
  rev: true,
  table: true,
  type: true,
};

function handleErrors(response) {
  // The errors property is an array of any changes that were sent to the server,
  // that were rejected, with an additional errors property that describes
  // the error.
  const errors = get(response, ['data', 'errors'], []);
  if (errors.length) {
    const errorMap = {};
    for (const error of errors) {
      errorMap[error.server_rev] = error;
    }
    // Set the return error data onto the changes - this will update the change
    // both with any errors and the results of any merging that happened prior
    // to the sync operation being called
    return db[CHANGES_TABLE].where('server_rev')
      .anyOf(Object.keys(errorMap).map(Number))
      .modify(obj => {
        for (const key in errorMap[obj.server_rev]) {
          if (!noModifyKeys[key] || typeof obj[key] === 'undefined') {
            obj[key] = errorMap[obj.server_rev][key];
          }
        }
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
    'desc',
  );
  const channelIds = uniq(allChanges.map(c => c.channel_id)).filter(Boolean);
  const maxRevs = {};
  const promises = [];
  for (const channelId of channelIds) {
    const channelChanges = allChanges.filter(c => c.channel_id === channelId);
    maxRevs[`${MAX_REV_KEY}.${channelId}`] = channelChanges[0].server_rev;
    const lastChannelEditIndex = findLastIndex(
      channelChanges,
      c => !c.errors && !c.user_id && c.created_by_id && c.type !== CHANGE_TYPES.PUBLISHED,
    );
    const lastPublishIndex = findLastIndex(
      channelChanges,
      c => !c.errors && !c.user_id && c.created_by_id && c.type === CHANGE_TYPES.PUBLISHED,
    );
    if (lastChannelEditIndex > lastPublishIndex) {
      promises.push(
        Channel.transaction({ mode: 'rw' }, () => {
          return Channel.table.update(channelId, { unpublished_changes: true });
        }),
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

const noUserError = 'No user logged in';

/**
 * @param {boolean} syncAllChanges
 * @return {Promise<[{}]>} - Resolves with an array of returned changes from the server
 */
function syncChanges(syncAllChanges) {
  // Note: we could in theory use Dexie syncable for what
  // we are doing here, but I can't find a good way to make
  // it ignore our regular API calls for seeding the database
  // Also, the pattern it expects for server interactions would
  // require greater backend rearchitecting to focus our server-client
  // interactions on changes to objects, with consistent and resolvable
  // revisions. We will do this for now, but we have the option of doing
  // something more involved and better architectured in the future.

  // Either scoping to a channel or to a user
  const syncLock = channelScope.id
    ? LOCK_NAMES.SYNC_CHANNEL.replace('{channel_id}', channelScope.id)
    : LOCK_NAMES.SYNC_USER;

  // If we are syncing all changes, we don't need to acquire an exclusive lock because we should
  // already have a global lock. Hopefully this could prevent the possibility of deadlocks.
  return acquireLock({ name: syncLock, exclusive: !syncAllChanges }, async () => {
    try {
      // Get the current user - if there is no user, we can't sync.
      const user = await Session.getSession();
      if (!user) {
        // If not logged in, nothing to do.
        throw new Error(noUserError);
      }

      const channel_revs = {};
      if (channelScope.id) {
        channel_revs[channelScope.id] = get(user, [MAX_REV_KEY, channelScope.id], 0);
      }

      const unAppliedChanges = await db[CHANGES_TABLE].orderBy('server_rev')
        .filter(c => c.synced && !c.errors && !c.disallowed)
        .toArray();

      const requestPayload = {
        changes: [],
        channel_revs,
        user_rev: user.user_rev || 0,
        unapplied_revs: unAppliedChanges.map(c => c.server_rev).filter(Boolean),
      };

      // Snapshot which revs we are syncing, so that we can
      // removes them from the changeRevs array after the sync
      const revsToSync = [];
      if (syncAllChanges) {
        const unsyncedRevs = await db[CHANGES_TABLE].filter(c => !c.synced).primaryKeys();
        revsToSync.push(...unsyncedRevs);
      } else {
        revsToSync.push(...changeRevs);
      }
      if (revsToSync.length) {
        const syncableChanges = db[CHANGES_TABLE].where('rev')
          .anyOf(revsToSync)
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
      // The response from the sync endpoint has the format:
      // {
      //   "disallowed": [],
      //   "allowed": [],
      //   "changes": [],
      //   "errors": [],
      //   "successes": [],
      // }
      const response = await client.post(urls['sync'](), requestPayload);
      // Clear out this many changes from changeRevs array, since we have now synced them.
      changeRevs.splice(0, revsToSync.length);
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
      // There was an error during syncing, log, but carry on
      if (err.message !== noUserError) {
        logging.error(err);
      }
    }
  });
}

// Set the sync debounce time artificially low in tests to avoid timeouts.
const syncDebounceWait = process.env.NODE_ENV === 'test' ? 1 : SYNC_IF_NO_CHANGES_FOR * 1000;
let syncDebounceTimer;
const syncDeferredStack = [];
let syncingPromise = Promise.resolve();

function doSyncChanges(syncAll = false) {
  syncDebounceTimer = null;
  // Splice all the resolve/reject handlers off the stack
  const deferredStack = syncDeferredStack.splice(0);
  // Wait for any existing sync to complete, then sync again.
  syncingPromise = syncingPromise
    .then(() =>
      acquireLock(
        {
          name: LOCK_NAMES.SYNC,
          // If syncAll is true, we want to acquire an exclusive lock, which would make it globally
          // blocking, otherwise we want to acquire a shared lock, which would allow other shared
          // locks to be acquired and should not intersect with a global exclusive lock if one is
          // already held.
          exclusive: syncAll,
        },
        () => syncChanges(syncAll),
      ),
    )
    .then(() => {
      // If it is successful call all of the resolve functions that we have stored
      // from all the Promises that have been returned while this specific debounce
      // has been active.
      for (const { resolve } of deferredStack) {
        resolve();
      }
    })
    .catch(err => {
      // If there is an error call reject for all previously returned promises.
      for (const { reject } of deferredStack) {
        reject(err);
      }
    });
  return syncingPromise;
}

export function debouncedSyncChanges(flush = false, syncAll = false) {
  // Logic for promise returning debounce vendored and modified from:
  // https://github.com/sindresorhus/p-debounce/blob/main/index.js
  // Return a promise that will consistently resolve when this debounced
  // function invocation is completed.
  return new Promise((resolve, reject) => {
    // Clear any current timeouts, so that this invocation takes precedence
    // Any subsequent calls will then also revoke this timeout.
    clearTimeout(syncDebounceTimer);
    // Add the resolve and reject handlers for this promise to the stack here.
    syncDeferredStack.push({ resolve, reject });
    if (flush) {
      // If immediate invocation is required immediately call doSyncChanges
      // rather than using a timeout delay.
      doSyncChanges(syncAll);
    } else {
      // Otherwise update the timeout to this invocation.
      syncDebounceTimer = setTimeout(() => doSyncChanges(syncAll), syncDebounceWait);
    }
  });
}

export function queueChange(rev) {
  if (rev) {
    changeRevs.push(rev);
  }
  debouncedSyncChanges();
}

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  window.forceServerSync = forceServerSync;
}

let intervalTimer;

const vueInstance = new Vue();

export function syncOnChanges() {
  vueInstance.$watch(() => changeRevs.length, debouncedSyncChanges);
}

export function startSyncing() {
  // Start the sync interval
  intervalTimer = setInterval(debouncedSyncChanges, SYNC_POLL_INTERVAL * 1000);
}

export function stopSyncing() {
  clearInterval(intervalTimer);
  debouncedSyncChanges(true);
}

/**
 * @return {Promise}
 */
export function forceServerSync() {
  return debouncedSyncChanges(true, true);
}
