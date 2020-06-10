import Dexie from 'dexie';
import merge from 'lodash/merge';
import sortBy from 'lodash/sortBy';
import { CHANGE_TYPES, IGNORED_SOURCE } from './constants';
import db from './db';
import { INDEXEDDB_RESOURCES } from './registry';

const { CREATED, DELETED, UPDATED, MOVED } = CHANGE_TYPES;

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
      let updatesThatApply = changes.filter(c => map.hasOwnProperty(c.key + ''));
      // Apply modifications onto each existing object (in memory)
      // and generate array of resulting objects to put using bulkPut():
      let objsToPut = updatesThatApply.map(c => {
        let curr = map[c.key + ''];
        merge(curr, c.mods);
        return curr;
      });
      return table.bulkPut(objsToPut);
    });
}

/*
 * Modified from https://github.com/dfahlander/Dexie.js/blob/master/addons/Dexie.Syncable/src/apply-changes.js
 */
export default function applyChanges(changes) {
  let collectedChanges = {};
  changes.forEach(change => {
    if (!collectedChanges.hasOwnProperty(change.table)) {
      collectedChanges[change.table] = { [CREATED]: [], [DELETED]: [], [UPDATED]: [], [MOVED]: [] };
    }
    collectedChanges[change.table][change.type].push(change);
  });
  let table_names = Object.keys(collectedChanges);
  let tables = table_names.map(table => db.table(table));

  return db.transaction('rw', tables, () => {
    Dexie.currentTransaction.source = IGNORED_SOURCE;
    const promises = [];
    table_names.forEach(table_name => {
      const table = db.table(table_name);
      const specifyKeys = !table.schema.primKey.keyPath;
      const createChangesToApply = collectedChanges[table_name][CREATED];
      const deleteChangesToApply = collectedChanges[table_name][DELETED];
      const updateChangesToApply = collectedChanges[table_name][UPDATED];
      const moveChangesToApply = collectedChanges[table_name][MOVED];
      if (createChangesToApply.length) {
        promises.push(
          table.bulkPut(
            createChangesToApply.map(c => c.obj),
            specifyKeys ? createChangesToApply.map(c => c.key) : undefined
          )
        );
      }
      if (updateChangesToApply.length) {
        promises.push(bulkUpdate(table, updateChangesToApply));
      }
      if (deleteChangesToApply.length) {
        promises.push(table.bulkDelete(deleteChangesToApply.map(c => c.key)));
      }
      if (moveChangesToApply.length) {
        sortBy(moveChangesToApply, 'rev').forEach(change => {
          if (INDEXEDDB_RESOURCES[change.table] && INDEXEDDB_RESOURCES[change.table].tableMove) {
            promises.push(
              INDEXEDDB_RESOURCES[change.table].tableMove(
                change.key,
                change.target,
                change.position
              )
            );
          }
        });
      }
    });
  });
}
