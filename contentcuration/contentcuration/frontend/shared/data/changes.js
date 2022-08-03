import Dexie from 'dexie';
import { EventEmitter } from 'events';
import db from 'shared/data/db';
import { promiseChunk } from 'shared/utils/helpers';
import {
  CHANGES_TABLE,
  REVERT_SOURCE,
  CHANGE_TYPES,
  IGNORED_SOURCE,
} from 'shared/data/constants';
import { Session } from "shared/data/resources";

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
export class ChangeTracker extends EventEmitter {
  constructor() {
    super();
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
    // if everything has been synced and applied, otherwise check the session for its max rev
    const [mostRecentChange, session] = await Promise.all([
      db[CHANGES_TABLE].orderBy('rev').last(),
      Session.getSession(),
    ]);

    this._startingRev = (mostRecentChange)
      ? mostRecentChange.rev
      : session.max_rev[Session.currentChannelId];
  }

  /**
   * Stop tracking changes
   * @return {ChangeTracker}
   */
  async stop() {
    // Collect the changes
    const changes = db[CHANGES_TABLE]
      .where('rev')
      .above(this._startingRev)
      .filter(change => !change.source.match(IGNORED_SOURCE))
    ;
    this._changes = await changes.sortBy('rev');
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
      if (Dexie.currentTransaction.source === REVERT_SOURCE) {
        return;
      }

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
      const table = db[change.table];
      return db.transaction('rw', change.table, () => {
        // This source inherits from `IGNORED_SOURCE` so this will be ignored
        Dexie.currentTransaction.source = REVERT_SOURCE;

        // If we had created something, we'll delete
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
          return table
            .where(table.schema.primKey.keyPath)
            .equals(change.key)
            .delete();
        } else if (
          change.type === CHANGE_TYPES.UPDATED ||
          change.type === CHANGE_TYPES.DELETED
        ) {
          // If we updated or deleted it, we just want the old stuff back
          return table.put(change.oldObj);
        } else if (change.type === CHANGE_TYPES.MOVED && change.oldObj) {
          // Lastly if this is a MOVE, then this was likely a single operation, so we just roll
          // it back
          return table.put(change.oldObj);
        }
      });
    });
  }
}
