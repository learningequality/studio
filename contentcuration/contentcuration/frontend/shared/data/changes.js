// eslint-disable-next-line import/no-named-as-default
import Dexie from 'dexie';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isPlainObject from 'lodash/isPlainObject';
import isUndefined from 'lodash/isUndefined';
import omit from 'lodash/omit';
import sortBy from 'lodash/sortBy';
import logging from '../logging';
import { resourceCounts } from './applyRemoteChanges';
import db, { CLIENTID } from 'shared/data/db';
import { promiseChunk } from 'shared/utils/helpers';
import {
  CHANGES_TABLE,
  CHANGE_TYPES,
  CHANGE_TYPES_LOOKUP,
  TABLE_NAMES,
  TABLE_NAMES_LOOKUP,
  RELATIVE_TREE_POSITIONS,
  RELATIVE_TREE_POSITIONS_LOOKUP,
  LAST_FETCHED,
  COPYING_STATUS,
  TASK_ID,
} from 'shared/data/constants';
import { INDEXEDDB_RESOURCES } from 'shared/data/registry';

/**
 * Wraps the callback with a new ChangeTracker that can be used to revert
 * the changes
 *
 * @param {function(...args, {ChangeTracker}): Promise<mixed>} callback
 * @return {function(...args): Promise<mixed>}
 */
export function withChangeTracker(callback) {
  return function (...args) {
    const tracker = new ChangeTracker();

    return tracker
      .start()
      .then(() => callback.call(this, ...args, tracker))
      .then(results => tracker.stop().then(() => results))
      .catch(e => {
        tracker.cleanUp();
        if (e instanceof Dexie.AbortError && tracker.reverted) {
          // In this case it seems we reverted before it was completed, so it was aborted
          return Promise.resolve([]);
        } else {
          // Pass on error
          return Promise.reject(e);
        }
      });
  };
}

/**
 * Represents multiple changes, with the ability to start and stop tracking them,
 * and to block their synchronization to allow for also reverting them.
 */
export class ChangeTracker {
  constructor() {
    this.reverted = false;
    this._startingRev = null;
    this._changes = null;
  }

  /**
   * @return {boolean}
   */
  get tracking() {
    return Boolean(this._startingRev) && !this._changes;
  }

  /**
   * Start tracking changes
   * @return {ChangeTracker}
   */
  async start() {
    if (this.tracking) {
      return;
    }

    // Grab the most recent change in the changes table, if it exists, which it might not
    const mostRecentChange = await db[CHANGES_TABLE].orderBy('rev').last();

    this._startingRev = mostRecentChange ? mostRecentChange.rev : null;
  }

  /**
   * Stop tracking changes
   * @return {ChangeTracker}
   */
  async stop() {
    // Collect the changes
    let changes = db[CHANGES_TABLE];

    // If we had a starting rev, filter to only those changes added since
    if (this._startingRev) {
      changes = changes.where('rev').above(this._startingRev);
    }

    this._changes = await changes
      // Filter out changes that were not made by this client/browser tab
      .filter(change => change.source === CLIENTID)
      .sortBy('rev');
  }

  /**
   * Clean up the changes to avoid holding onto the data for too long
   */
  cleanUp() {
    this._startingRev = null;
    this._changes = null;
  }

  /**
   * Reverts all changes that have occurred while this was tracking
   *
   * @return {Promise}
   */
  async revert() {
    if (this.tracking || this.reverted) {
      return;
    }

    if (!this._changes || !this._changes.length) {
      throw new Error('Unable to revert changes without tracking some changes');
    }

    this.reverted = true;

    if (Dexie.currentTransaction) {
      // We're in the middle of a transaction, so just abort that
      Dexie.currentTransaction.abort();
      return;
    }

    await this.doRevert();
  }

  doRevert() {
    // We'll go through each change one by one and revert each.
    //
    // R. Tibbles: I think this could be done in two queries (TODO)
    return promiseChunk(this._changes.reverse(), 1, async ([change]) => {
      const resource = INDEXEDDB_RESOURCES[change.table];
      if (!resource) {
        if (process.env.NODE_ENV !== 'production') {
          /* eslint-disable no-console */
          console.warn(`Resource does not exist for table '${change.table}'`);
          /* eslint-enable */
        }
        return Promise.resolve();
      }

      // Query siblings before starting the transaction
      // to avoid any potential API call inside the transaction
      let siblings;
      if (change.type === CHANGE_TYPES.MOVED && change.oldObj) {
        const { parent } = change.oldObj;
        siblings = await resource.where({ parent }, false);
        siblings = siblings.filter(sibling => sibling.id !== change.key);
      }

      return resource.transaction({}, CHANGES_TABLE, () => {
        // If we had created something, we'll delete it
        // Special MOVED case here comes from the operation of COPY then MOVE for duplicating
        // content nodes, which in this case would be on the Tree table, so we're removing
        // the tree record
        if (
          change.type === CHANGE_TYPES.CREATED ||
          change.type === CHANGE_TYPES.COPIED ||
          (change.type === CHANGE_TYPES.MOVED && !change.oldObj)
        ) {
          // Use resource's delete method to propogate sync object to backend.
          return resource.delete(change.key);
        } else if (change.type === CHANGE_TYPES.UPDATED || change.type === CHANGE_TYPES.DELETED) {
          // If we updated or deleted it, we just want the old stuff back
          return resource.table.put(change.oldObj);
        } else if (change.type === CHANGE_TYPES.MOVED && change.oldObj) {
          // Lastly if this is a MOVE, we generate a reverse move back to its old position
          const { parent, lft } = change.oldObj;

          // Collect the affected node's siblings prior to the change
          // Search the siblings ordered by `lft` to find the first a sibling
          // where we should move the node, positioned before that sibling
          const relativeSibling = sortBy(siblings, 'lft').find(sibling => sibling.lft >= lft);
          if (relativeSibling) {
            return resource.move(change.key, relativeSibling.id, RELATIVE_TREE_POSITIONS.LEFT);
          }

          // this handles if there were no siblings OR if the deleted node was at the end
          return resource.move(change.key, parent, RELATIVE_TREE_POSITIONS.LAST_CHILD);
        } else {
          if (process.env.NODE_ENV !== 'production') {
            /* eslint-disable no-console */
            console.warn(`Attempted to revert unsupported change type '${change.type}'`);
            /* eslint-enable */
          }
        }
      });
    });
  }
}

// These fields should not be included in change objects that we
// store in the changes table for syncing to the backend
// as they are only used for tracking state locally
const ignoredSubFields = [COPYING_STATUS, LAST_FETCHED, TASK_ID];

function omitIgnoredSubFields(obj) {
  return omit(obj, ignoredSubFields);
}

export class Change {
  constructor({ type, key, table, source } = {}) {
    this.setAndValidateLookup(type, 'type', CHANGE_TYPES_LOOKUP);
    this.setAndValidateIsDefined(key, 'key');
    this.setAndValidateLookup(table, 'table', TABLE_NAMES_LOOKUP);
    if (!INDEXEDDB_RESOURCES[this.table].syncable) {
      const error = new ReferenceError(`${this.table} is not a syncable table`);
      logging.error(error);
      throw error;
    }
    this.setAndValidateString(source, 'source');
  }

  get changeType() {
    return this.constructor.name;
  }

  get channelOrUserIdSet() {
    return !isUndefined(this.channel_id) || !isUndefined(this.user_id);
  }

  setChannelAndUserId(obj) {
    const channel_id = INDEXEDDB_RESOURCES[this.table].getChannelId(obj);
    if (channel_id) {
      this.channel_id = channel_id;
    }
    const user_id = INDEXEDDB_RESOURCES[this.table].getUserId(obj);
    if (user_id) {
      this.user_id = user_id;
    }
  }

  setAndValidateLookup(value, name, lookup) {
    if (!lookup[value]) {
      const error = new ReferenceError(`${value} is not a valid ${name} value`);
      logging.error(error, value);
      throw error;
    }
    this[name] = value;
  }

  validateIsDefined(value, name) {
    if (isNull(value) || isUndefined(value)) {
      const error = new TypeError(
        `${name} is required for a ${this.changeType} but it was ${
          isNull(value) ? 'null' : 'undefined'
        }`,
      );
      logging.error(error, value);
      throw error;
    }
  }

  setAndValidateIsDefined(value, name) {
    this.validateIsDefined(value, name);
    this[name] = value;
  }

  validateObj(value, name) {
    if (!isPlainObject(value)) {
      const error = new TypeError(`${name} should be an object, but ${value} was passed instead`);
      logging.error(error, value);
      throw error;
    }
  }

  setAndValidateObj(value, name, mapper = obj => obj) {
    this.validateObj(value, name);
    this[name] = mapper(value);
  }

  setAndValidateBoolean(value, name) {
    if (typeof value !== 'boolean') {
      const error = new TypeError(`${name} should be a boolean, but ${value} was passed instead`);
      logging.error(error, value);
      throw error;
    }
    this[name] = value;
  }

  setAndValidateObjOrNull(value, name, mapper = obj => obj) {
    if (!isPlainObject(value) && !isNull(value)) {
      const error = new TypeError(
        `${name} should be an object or null, but ${value} was passed instead`,
      );
      logging.error(error, value);
      throw error;
    }
    this[name] = mapper(value);
  }

  setAndValidateString(value, name) {
    if (typeof value !== 'string') {
      const error = new TypeError(`${name} should be a string, but ${value} was passed instead`);
      logging.error(error, value);
      throw error;
    }
    this[name] = value;
  }

  async saveChange() {
    if (!this.channelOrUserIdSet) {
      throw new ReferenceError(
        `Attempted to save ${this.changeType} change for ${this.table} before setting channel_id and user_id`,
      );
    }
    const rev = await db[CHANGES_TABLE].add(this);
    // Do not await this
    resourceCounts.apply(this);
    return rev;
  }
}

export class CreatedChange extends Change {
  constructor({ obj, ...fields }) {
    fields.type = CHANGE_TYPES.CREATED;
    super(fields);
    this.setAndValidateObj(obj, 'obj', omitIgnoredSubFields);
    this.setChannelAndUserId(obj);
  }
}

export class UpdatedChange extends Change {
  constructor({ oldObj, changes, ...fields }) {
    fields.type = CHANGE_TYPES.UPDATED;
    super(fields);
    this.validateObj(changes, 'changes');
    this.validateObj(oldObj, 'oldObj');
    changes = omitIgnoredSubFields(changes);
    oldObj = omitIgnoredSubFields(oldObj);
    // For now, the aim here is to preserve the same change structure as found in
    // the Dexie Observable updating hook:
    // https://github.com/dexie/Dexie.js/blob/master/addons/Dexie.Observable/src/hooks/updating.js#L15
    const newObj = Dexie.deepClone(oldObj);
    Object.assign(newObj, changes);
    const mods = Dexie.getObjectDiff(oldObj, newObj);
    for (const propPath in mods) {
      const mod = mods[propPath];
      const currentValue = Dexie.getByKeyPath(oldObj, propPath);
      if (mod !== currentValue && JSON.stringify(mod) !== JSON.stringify(currentValue)) {
        if (typeof mod === 'undefined') {
          // Null is as close we could come to deleting a property when not allowing undefined.
          mods[propPath] = null;
        }
      } else {
        delete mods[propPath];
      }
    }
    this.mods = mods;
    if (!this.changed) {
      return;
    }
    this.oldObj = oldObj;
    this.obj = newObj;
    this.setChannelAndUserId(oldObj);
  }
  get changed() {
    return !isEmpty(this.mods);
  }
  saveChange() {
    if (!this.changed) {
      return Promise.resolve(null);
    }
    return super.saveChange();
  }
}

export class DeletedChange extends Change {
  constructor({ oldObj, ...fields }) {
    fields.type = CHANGE_TYPES.DELETED;
    super(fields);
    this.setAndValidateObj(oldObj, 'oldObj', omitIgnoredSubFields);
    this.setChannelAndUserId(oldObj);
  }
}

export class MovedChange extends Change {
  constructor({ oldObj, target, position, parent, ...fields }) {
    fields.type = CHANGE_TYPES.MOVED;
    super(fields);
    if (this.table !== TABLE_NAMES.CONTENTNODE) {
      throw TypeError(
        `${this.changeType} is only supported by ${TABLE_NAMES.CONTENTNODE} table but ${this.table} was passed instead`,
      );
    }
    this.setAndValidateObj(oldObj, 'oldObj', omitIgnoredSubFields);
    this.setAndValidateIsDefined(target, 'target');
    this.setAndValidateLookup(position, 'position', RELATIVE_TREE_POSITIONS_LOOKUP);
    this.setAndValidateIsDefined(parent, 'parent');
    this.setChannelAndUserId();
  }
}

export class CopiedChange extends Change {
  constructor({ from_key, mods, target, position, excluded_descendants, parent, ...fields }) {
    fields.type = CHANGE_TYPES.COPIED;
    super(fields);
    if (this.table !== TABLE_NAMES.CONTENTNODE) {
      throw TypeError(
        `${this.changeType} is only supported by ${TABLE_NAMES.CONTENTNODE} table but ${this.table} was passed instead`,
      );
    }
    this.setAndValidateIsDefined(from_key, 'from_key');
    this.setAndValidateObj(mods, 'mods', omitIgnoredSubFields);
    this.setAndValidateIsDefined(target, 'target');
    this.setAndValidateLookup(position, 'position', RELATIVE_TREE_POSITIONS_LOOKUP);
    this.setAndValidateObjOrNull(excluded_descendants, 'excluded_descendants');
    this.setAndValidateIsDefined(parent, 'parent');
    this.setChannelAndUserId();
  }
}

export class PublishedChange extends Change {
  constructor({ version_notes, language, ...fields }) {
    fields.type = CHANGE_TYPES.PUBLISHED;
    super(fields);
    if (this.table !== TABLE_NAMES.CHANNEL) {
      throw TypeError(
        `${this.changeType} is only supported by ${TABLE_NAMES.CHANNEL} table but ${this.table} was passed instead`,
      );
    }
    this.setAndValidateIsDefined(version_notes, 'version_notes');
    this.setAndValidateIsDefined(language, 'language');
    this.setChannelAndUserId({ id: this.key });
  }
}

export class PublishedNextChange extends Change {
  constructor(fields) {
    fields.type = CHANGE_TYPES.PUBLISHED_NEXT;
    super(fields);
    if (this.table !== TABLE_NAMES.CHANNEL) {
      throw TypeError(
        `${this.changeType} is only supported by ${TABLE_NAMES.CHANNEL} table but ${this.table} was passed instead`,
      );
    }
    this.setChannelAndUserId({ id: this.key });
  }
}

export class SyncedChange extends Change {
  constructor({ titles_and_descriptions, resource_details, files, assessment_items, ...fields }) {
    fields.type = CHANGE_TYPES.SYNCED;
    super(fields);
    if (this.table !== TABLE_NAMES.CHANNEL) {
      throw TypeError(
        `${this.changeType} is only supported by ${TABLE_NAMES.CHANNEL} table but ${this.table} was passed instead`,
      );
    }
    this.setAndValidateBoolean(titles_and_descriptions, 'titles_and_descriptions');
    this.setAndValidateBoolean(resource_details, 'resource_details');
    this.setAndValidateBoolean(files, 'files');
    this.setAndValidateBoolean(assessment_items, 'assessment_items');
    this.setChannelAndUserId({ id: this.key });
  }
}

export class DeployedChange extends Change {
  constructor(fields) {
    fields.type = CHANGE_TYPES.DEPLOYED;
    super(fields);
    if (this.table !== TABLE_NAMES.CHANNEL) {
      throw TypeError(
        `${this.changeType} is only supported by ${TABLE_NAMES.CHANNEL} table but ${this.table} was passed instead`,
      );
    }
    this.setChannelAndUserId({ id: this.key });
  }
}

/**
 * Change that represents an update to a content node and its descendants
 * It can be used just with the content node table.
 */
export class UpdatedDescendantsChange extends Change {
  constructor({ oldObj, changes, ...fields }) {
    fields.type = CHANGE_TYPES.UPDATED_DESCENDANTS;
    super(fields);
    if (this.table !== TABLE_NAMES.CONTENTNODE) {
      throw TypeError(
        `${this.changeType} is only supported by ${TABLE_NAMES.CONTENTNODE} table but ${this.table} was passed instead`,
      );
    }
    this.validateObj(changes, 'changes');
    changes = omitIgnoredSubFields(changes);
    this.mods = changes;
    this.setChannelAndUserId(oldObj);
  }

  get changed() {
    return !isEmpty(this.mods);
  }

  saveChange() {
    if (!this.changed) {
      return Promise.resolve(null);
    }
    return super.saveChange();
  }
}
