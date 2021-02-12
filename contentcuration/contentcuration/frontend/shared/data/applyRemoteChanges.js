import Dexie from 'dexie';
import flatten from 'lodash/flatten';
import sortBy from 'lodash/sortBy';
import { CHANGE_TYPES, IGNORED_SOURCE } from './constants';
import db from './db';
import { INDEXEDDB_RESOURCES } from './registry';

const { CREATED, DELETED, UPDATED, MOVED } = CHANGE_TYPES;

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

/*
 * Modified from https://github.com/dfahlander/Dexie.js/blob/master/addons/Dexie.Syncable/src/bulk-update.js
 */
function bulkUpdate(table, changes) {
  let keys = changes.map(c => c.key);
  let map = {};
  // Retrieve current object of each change to update and map each
  // found object's primary key to the existing object:
  return table
    .where(':id')
    .anyOf(keys)
    .raw()
    .each((obj, cursor) => {
      map[cursor.primaryKey + ''] = obj;
    })
    .then(() => {
      // Filter away changes whose key wasn't found in the local database
      // (we can't update them if we do not know the existing values)
      let updatesThatApply = changes.filter(c =>
        Object.prototype.hasOwnProperty.call(map, c.key + '')
      );
      // Apply modifications onto each existing object (in memory)
      // and generate array of resulting objects to put using bulkPut():
      let objsToPut = updatesThatApply.map(c => {
        let curr = map[c.key + ''];
        applyMods(curr, c.mods);
        return curr;
      });
      return table.bulkPut(objsToPut).then(() => objsToPut);
    });
}

function bulkCreate(table, changes) {
  const specifyKeys = !table.schema.primKey.keyPath;
  const objs = changes.map(c => c.obj);
  return table.bulkPut(objs, specifyKeys ? changes.map(c => c.key) : undefined).then(() => objs);
}

export function collectChanges(changes) {
  const collectedChanges = {};
  changes.forEach(change => {
    if (!Object.prototype.hasOwnProperty.call(collectedChanges, change.table)) {
      collectedChanges[change.table] = { [CREATED]: [], [DELETED]: [], [UPDATED]: [], [MOVED]: [] };
    }
    collectedChanges[change.table][change.type].push(change);
  });
  return collectedChanges;
}

/**
 * @param {{table: string, rev: Number, key: string, target: string, position: string}} changes
 * @return {Promise[]}
 */
function applyMoveChanges(changes) {
  return sortBy(changes, 'rev')
    .map(change => {
      const resource = INDEXEDDB_RESOURCES[change.table];
      if (!resource || !resource.tableMove) {
        return null;
      }

      const { key, target, position } = change;
      return resource.resolveTreeInsert(key, target, position, false, data => {
        data.change.source = IGNORED_SOURCE;
        return resource.tableMove(data);
      });
    })
    .filter(Boolean);
}

/*
 * Modified from https://github.com/dfahlander/Dexie.js/blob/master/addons/Dexie.Syncable/src/apply-changes.js
 */
export default function applyChanges(changes) {
  const collectedChanges = collectChanges(changes);
  let table_names = Object.keys(collectedChanges);
  let tables = table_names.map(table => db.table(table));

  return db.transaction('rw', tables, () => {
    Dexie.currentTransaction.source = IGNORED_SOURCE;
    const promises = [];
    table_names.forEach(table_name => {
      const table = db.table(table_name);
      const createChangesToApply = collectedChanges[table_name][CREATED];
      const deleteChangesToApply = collectedChanges[table_name][DELETED];
      const updateChangesToApply = collectedChanges[table_name][UPDATED];
      const moveChangesToApply = collectedChanges[table_name][MOVED];
      if (createChangesToApply.length) {
        promises.push(bulkCreate(table, createChangesToApply));
      }
      if (updateChangesToApply.length) {
        promises.push(bulkUpdate(table, updateChangesToApply));
      }
      if (deleteChangesToApply.length) {
        promises.push(table.bulkDelete(deleteChangesToApply.map(c => c.key)).then(() => null));
      }
      if (moveChangesToApply.length) {
        promises.push(...applyMoveChanges(moveChangesToApply));
      }
    });
    return Promise.all(promises).then(results => flatten(results).filter(Boolean));
  });
}
