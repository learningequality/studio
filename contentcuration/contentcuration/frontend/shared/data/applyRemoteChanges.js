import Dexie from 'dexie';
import flatten from 'lodash/flatten';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import { CHANGE_TYPES, IGNORED_SOURCE, TABLE_NAMES } from './constants';
import db from './db';
import { INDEXEDDB_RESOURCES } from './registry';

const { CREATED, DELETED, UPDATED, MOVED, PUBLISHED, SYNCED } = CHANGE_TYPES;

export function applyMods(obj, mods) {
  for (let keyPath in mods) {
    if (mods[keyPath] === null) {
      Dexie.delByKeyPath(obj, keyPath);
    } else {
      Dexie.setByKeyPath(obj, keyPath, mods[keyPath]);
    }
  }
  return obj;
}

function applyUpdate(table, change) {
  return table
    .where(':id')
    .equals(change.key)
    .modify(obj => applyMods(obj, change.mods));
}

function applyCreate(table, change) {
  return table
    .put(change.obj, !table.schema.primKey.keyPath ? change.key : undefined)
    .then(() => change.obj);
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
      };
    }
    collectedChanges[change.table][change.type].push(change);
  });
  return collectedChanges;
}

/**
 * @param {table: string, rev: Number, key: string, target: string, position: string} change
 * @return {Promise{}}
 */
function applyMove(change) {
  const resource = INDEXEDDB_RESOURCES[change.table];
  if (!resource || !resource.tableMove) {
    return null;
  }

  const { key, target, position } = change;
  return resource.resolveTreeInsert(key, target, position, false, data => {
    data.change.source = IGNORED_SOURCE;
    return resource.tableMove(data);
  });
}

function applyPublish(change) {
  if (change.table !== TABLE_NAMES.CHANNEL) {
    return null;
  }

  const ContentNode = INDEXEDDB_RESOURCES[TABLE_NAMES.CONTENTNODE];
  return ContentNode.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
    return ContentNode.table
      .where({ channel_id: change.channel_id })
      .modify({ changed: false, published: true });
  });
}

/*
 * Modified from https://github.com/dfahlander/Dexie.js/blob/master/addons/Dexie.Syncable/src/apply-changes.js
 */
export default function applyChanges(changes) {
  if (!changes.length) {
    return Promise.resolve();
  }

  changes = sortBy(changes, ['server_rev', 'rev']);

  const table_names = uniq(changes.map(c => c.table));
  // When changes include a publish change, add the contentnode table since `applyPublish` above
  // needs to make updates to content nodes
  if (
    changes.some(c => c.type === CHANGE_TYPES.PUBLISHED) &&
    !table_names.includes(TABLE_NAMES.CONTENTNODE)
  ) {
    table_names.push(TABLE_NAMES.CONTENTNODE);
  }
  const tables = table_names.map(table => db.table(table));

  return db.transaction('rw', tables, () => {
    Dexie.currentTransaction.source = IGNORED_SOURCE;
    const promises = changes.map(change => {
      const table = db.table(change.table);
      if (change.type === CHANGE_TYPES.CREATED) {
        return applyCreate(table, change);
      }
      if (change.type === CHANGE_TYPES.UPDATED) {
        return applyUpdate(table, change);
      }
      if (change.type === CHANGE_TYPES.DELETED) {
        return table.delete(change.key);
      }
      if (change.type === CHANGE_TYPES.MOVED) {
        return applyMove(change);
      }
      if (change.type === CHANGE_TYPES.PUBLISHED) {
        return applyPublish(change);
      }
    });
    return Promise.all(promises).then(results => flatten(results).filter(Boolean));
  });
}
