import debounce from 'lodash/debounce';
import findLastIndex from 'lodash/findLastIndex';
import get from 'lodash/get';
import omit from 'lodash/omit';
import orderBy from 'lodash/orderBy';
import pick from 'lodash/pick';
import uniq from 'lodash/uniq';
import mergeAllChanges from './mergeChanges';
import db from './db';
import applyChanges from './applyRemoteChanges';
import { INDEXEDDB_RESOURCES } from './registry';
import { Channel, Session, Task } from './resources';
import {
  ACTIVE_CHANNELS,
  CHANGES_TABLE,
  CHANGE_TYPES,
  CHANNEL_SYNC_KEEP_ALIVE_INTERVAL,
  IGNORED_SOURCE,
  MAX_REV_KEY,
  LAST_FETCHED,
  COPYING_FLAG,
  TASK_ID,
} from './constants';
import client from 'shared/client';
import urls from 'shared/urls';

// When this many seconds pass without a syncable
// change being registered, sync changes!
const SYNC_IF_NO_CHANGES_FOR = 0.5;

// Set ping interval to 25 seconds
const WEBSOCKET_PING_INTERVAL = 25000;

let socket;
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

function handleDisallowed(disallowed) {
  // The disallowed property is an array of any changes that were sent to the server,
  // that were rejected.
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

function handleAllowed(allowed) {
  // The allowed property is an array of any rev and server_rev for any changes sent to
  // the server that were accepted
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

function handleReturnedChanges(returnedChanges) {
  // The changes property is an array of any changes from the server to apply in the
  // client.
  if (returnedChanges.length) {
    return applyChanges(returnedChanges);
  }
  return Promise.resolve();
}

function handleErrors(errors) {
  // The errors property is an array of any changes that were sent to the server,
  // that were rejected, with an additional errors property that describes
  // the error.
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

function handleTasks(tasks) {
  return Task.setTasks(tasks);
}

function handleSuccesses(successes) {
  // The successes property is an array of server_revs for any previously synced changes
  // that have now been successfully applied on the server.
  if (successes.length) {
    return db[CHANGES_TABLE].where('server_rev')
      .anyOf(successes.map(c => c.server_rev))
      .delete();
  }
  return Promise.resolve();
}

function handleMaxRevs(changes, userId) {
  const allChanges = orderBy(changes, 'server_rev', 'desc');
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

async function WebsocketSendChanges() {
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
    const changes = changesToSync.map(trimChangeForSync);
    // Create a promise for the sync - if there is nothing to sync just resolve immediately,
    // in order to still call our change cleanup code.
    if (changes.length) {
      requestPayload.changes = changes;
      //set ping to false to reset ping timmer
      socket.send(
        JSON.stringify({
          payload: requestPayload,
        })
      );
      debouncePingMessage();
    }
  }
  syncActive = false;
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

  const unAppliedChanges = await db[CHANGES_TABLE].orderBy('server_rev')
    .filter(c => c.synced && !c.errors && !c.disallowed)
    .toArray();

  const requestPayload = {
    changes: [],
    channel_revs,
    user_rev: user.user_rev || 0,
    unapplied_revs: unAppliedChanges.map(c => c.server_rev).filter(Boolean),
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
        handleDisallowed(get(response, ['data', 'disallowed'], [])),
        handleAllowed(get(response, ['data', 'allowed'], [])),
        handleReturnedChanges(get(response, ['data', 'changes'], [])),
        handleErrors(get(response, ['data', 'errors'], [])),
        handleSuccesses(get(response, ['data', 'successes'], [])),
        handleMaxRevs(
          get(response, ['data', 'changes'], [])
            .concat(get(response, ['data', 'errors'], []))
            .concat(get(response, ['data', 'successes'], [])),
          user.id
        ),
        handleTasks(get(response, ['data', 'tasks'], [])),
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

const debouncePingMessage = debounce(() => {
  socket.send(
    JSON.stringify({
      ping: 'PING!',
    })
  );
  debouncePingMessage();
}, WEBSOCKET_PING_INTERVAL);

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
  const newChangeTableEntries = changes.filter(
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

  if (newChangeTableEntries.length) {
    if (!syncActive) {
      WebsocketSendChanges();
    }
  }
}

let intervalTimer;

export function startSyncing() {
  // Initiate a sync immediately in case any data
  // is left over in the database.
  debouncedSyncChanges();
  const websocketUrl = new URL(
    `/ws/sync_socket/${window.CHANNEL_EDIT_GLOBAL.channel_id}/`,
    window.location.href
  );
  websocketUrl.protocol = window.location.protocol == 'https:' ? 'wss:' : 'ws:';

  socket = new WebSocket(websocketUrl);

  // Connection opened
  socket.addEventListener('open', () => {
    console.log('Websocket connected');
  });

  //Keep Pinging the websocket connection to keep connection alive
  debouncePingMessage();

  // Listen for any errors due to which connection may be closed.
  socket.addEventListener('error', event => {
    console.log('WebSocket error: ', event);
  });

  socket.addEventListener('message', async e => {
    const data = JSON.parse(e.data);
    const user = await Session.getSession();
    console.log(data);
    if (data.task) {
      Task.setTasks([data.task]);
    }
    if (data.response_payload && data.response_payload.allowed) {
      try {
        handleAllowed(data.response_payload.allowed);
      } catch (err) {
        console.log(err);
      }
    }
    if (data.response_payload && data.response_payload.disallowed) {
      try {
        handleDisallowed(data.response_payload.disallowed);
      } catch (err) {
        console.log(err);
      }
    }
    if (data.change) {
      try {
        handleReturnedChanges([data.change]);
        handleMaxRevs([data.change], user.id);
      } catch (err) {
        console.log(err);
      }
    }
    if (data.errored) {
      try {
        handleErrors([data.errored]);
        handleMaxRevs([data.errored], user.id);
      } catch (err) {
        console.log(err);
      }
    }
    if (data.success) {
      try {
        handleSuccesses([data.success]);
        handleMaxRevs([data.success], user.id);
      } catch (err) {
        console.log(err);
      }
    }
  });

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
