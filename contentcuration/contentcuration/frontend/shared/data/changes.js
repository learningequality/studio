import Dexie from 'dexie';
import sortBy from 'lodash/sortBy';
import db from 'shared/data/db';
import { promiseChunk } from 'shared/utils/helpers';
import {
  CHANGES_TABLE,
  CHANGE_TYPES,
  IGNORED_SOURCE,
  RELATIVE_TREE_POSITIONS,
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
  return function(...args) {
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
      .filter(change => !change.source.match(IGNORED_SOURCE))
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
    return promiseChunk(this._changes.reverse(), 1, ([change]) => {
      const resource = INDEXEDDB_RESOURCES[change.table];
      if (!resource) {
        if (process.env.NODE_ENV !== 'production') {
          /* eslint-disable no-console */
          console.warn(`Resource does not exist for table '${change.table}'`);
          /* eslint-enable */
        }
        return Promise.resolve();
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
          // Get the primary key's field name off the table to make sure we delete by
          // the change key
          return resource.table
            .where(resource.table.schema.primKey.keyPath)
            .equals(change.key)
            .delete();
        } else if (change.type === CHANGE_TYPES.UPDATED || change.type === CHANGE_TYPES.DELETED) {
          // If we updated or deleted it, we just want the old stuff back
          return resource.table.put(change.oldObj);
        } else if (change.type === CHANGE_TYPES.MOVED && change.oldObj) {
          // Lastly if this is a MOVE, we generate a reverse move back to its old position
          const { parent, lft } = change.oldObj;

          // Collect the affected node's siblings prior to the change
          return resource.where({ parent }, false).then(siblings => {
            // Search the siblings ordered by `lft` to find the first a sibling
            // where we should move the node, positioned before that sibling
            let relativeSibling = sortBy(siblings, 'lft').find(sibling => sibling.lft >= lft);
            if (relativeSibling) {
              return resource.move(change.key, relativeSibling.id, RELATIVE_TREE_POSITIONS.LEFT);
            }

            // this handles if there were no siblings OR if the deleted node was at the end
            return resource.move(change.key, parent, RELATIVE_TREE_POSITIONS.LAST_CHILD);
          });
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
