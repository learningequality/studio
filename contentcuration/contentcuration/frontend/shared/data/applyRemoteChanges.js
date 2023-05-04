import Dexie from 'dexie';
import sortBy from 'lodash/sortBy';
import { CHANGE_TYPES, IGNORED_SOURCE, TABLE_NAMES } from './constants';
import db from './db';
import { INDEXEDDB_RESOURCES } from './registry';

const { CREATED, DELETED, UPDATED, MOVED, PUBLISHED, SYNCED, DEPLOYED } = CHANGE_TYPES;

export function applyMods(obj, mods) {
  for (const keyPath in mods) {
    if (mods[keyPath] === null) {
      Dexie.delByKeyPath(obj, keyPath);
    } else {
      Dexie.setByKeyPath(obj, keyPath, mods[keyPath]);
    }
  }
  return obj;
}

export function collectChanges(changes) {
  const collectedChanges = {};
  changes.forEach(change => {
    if (!Object.prototype.hasOwnProperty.call(collectedChanges, change.table)) {
      collectedChanges[change.table] = {
        [CREATED]: [],
        [DELETED]: [],
        [UPDATED]: [],
        [MOVED]: [],
        [PUBLISHED]: [],
        [SYNCED]: [],
        [DEPLOYED]: [],
      };
    }
    collectedChanges[change.table][change.type].push(change);
  });
  return collectedChanges;
}

/**
 * @param {Object} change - The change object
 * @param {String|Function} args[] - string table names with callback at the end
 * @returns {Promise}
 */
function transaction(change, ...args) {
  const callback = args.pop();
  const tableNames = [change.table, ...args];
  return db.transaction('rw', tableNames, () => {
    Dexie.currentTransaction.source = IGNORED_SOURCE;
    return callback();
  });
}

function applyCreate(change) {
  return transaction(change, () => {
    const table = db.table(change.table);
    return table
      .put(change.obj, !table.schema.primKey.keyPath ? change.key : undefined)
      .then(() => change.obj);
  });
}

function applyUpdate(change) {
  return transaction(change, () => {
    return db
      .table(change.table)
      .where(':id')
      .equals(change.key)
      .modify(obj => applyMods(obj, change.mods));
  });
}

function applyDelete(change) {
  return transaction(change, () => {
    return db.table(change.table).delete(change.key);
  });
}

function applyMove(change) {
  const resource = INDEXEDDB_RESOURCES[change.table];
  if (!resource || !resource.tableMove) {
    return Promise.resolve();
  }

  const { key, target, position } = change;
  return resource.resolveTreeInsert(key, target, position, false, data => {
    return transaction(change, () => {
      return resource.tableMove(data);
    });
  });
}

function applyCopy(change) {
  const resource = INDEXEDDB_RESOURCES[change.table];
  if (!resource || !resource.tableCopy) {
    return Promise.resolve();
  }

  const { key, target, position, from_key } = change;
  // copying takes the ID of the node to copy, so we use `from_key`
  return resource.resolveTreeInsert(from_key, target, position, true, data => {
    return transaction(change, () => {
      // Update the ID on the payload to match the received change, since isCreate=true
      // would generate new IDs
      data.payload.id = key;
      return resource.tableCopy(data);
    });
  });
}

function applyPublish(change) {
  if (change.table !== TABLE_NAMES.CHANNEL) {
    return Promise.resolve();
  }

  // Publish changes associate with the channel, but we open a transaction on contentnode
  return transaction(change, TABLE_NAMES.CONTENTNODE, () => {
    return db
      .table(TABLE_NAMES.CONTENTNODE)
      .where({ channel_id: change.channel_id })
      .modify({ changed: false, published: true });
  });
}

/**
 * @see https://github.com/dfahlander/Dexie.js/blob/master/addons/Dexie.Syncable/src/apply-changes.js
 * @return {Promise<Array>}
 */
export default async function applyChanges(changes) {
  const results = [];
  for (const change of sortBy(changes, ['server_rev', 'rev'])) {
    let result;
    if (change.type === CHANGE_TYPES.CREATED) {
      result = await applyCreate(change);
    } else if (change.type === CHANGE_TYPES.UPDATED) {
      result = await applyUpdate(change);
    } else if (change.type === CHANGE_TYPES.DELETED) {
      result = await applyDelete(change);
    } else if (change.type === CHANGE_TYPES.MOVED) {
      result = await applyMove(change);
    } else if (change.type === CHANGE_TYPES.COPIED) {
      result = await applyCopy(change);
    } else if (change.type === CHANGE_TYPES.PUBLISHED) {
      result = await applyPublish(change);
    }

    if (result) {
      results.push(result);
    }
  }

  return results;
}
