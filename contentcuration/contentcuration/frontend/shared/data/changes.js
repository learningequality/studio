import Dexie from 'dexie';
import uuidv4 from 'uuid/v4';
import { EventEmitter } from 'events';
import db, { CLIENTID } from 'shared/data/db';
import { promiseChunk } from 'shared/utils/helpers';
import {
  CHANGE_LOCKS_TABLE,
  CHANGES_TABLE,
  REVERT_SOURCE,
  CHANGE_TYPES,
  IGNORED_SOURCE,
} from 'shared/data/constants';

/**
 * @param {Function} callback
 * @return {*}
 */
function ignoreTransaction(callback) {
  return new Promise((resolve, reject) => {
    Dexie.ignoreTransaction(() => {
      callback()
        .then(resolve)
        .catch(reject);
    });
  });
}

/**
 * @param {ChangeTracker} tracker
 * @param {string} table_name
 * @return {Promise}
 */
function createLock(tracker, table_name) {
  return db[table_name]
    .toCollection()
    .last()
    .then(lastChange => {
      // Expiry starts at 0, until stopped
      return db[CHANGE_LOCKS_TABLE].put({
        tracker_id: tracker.id,
        source: CLIENTID,
        table_name,
        expiry: 0,
        rev_start: lastChange ? lastChange.rev : 0,
      });
    });
}

/**
 * @return {Promise}
 */
export function hasActiveLocks() {
  const now = new Date();
  return ignoreTransaction(() => {
    return db[CHANGE_LOCKS_TABLE].where('expiry')
      .above(now.getTime())
      .or('expiry')
      .equals(0)
      .count();
  });
}

/**
 * @param {Object} params -- Where params
 * @return {Promise}
 */
function getLocks(params) {
  return ignoreTransaction(() => {
    return db[CHANGE_LOCKS_TABLE].where(params).toArray();
  });
}

/**
 * @param {Object} params -- Where params
 * @return {Promise}
 */
export function clearLocks(params) {
  return ignoreTransaction(() => {
    return db[CHANGE_LOCKS_TABLE].where(params).delete();
  });
}

/**
 * @return {Promise}
 */
export function cleanupLocks() {
  const now = new Date();
  return ignoreTransaction(() => {
    return db[CHANGE_LOCKS_TABLE].where('expiry')
      .between(0, now.getTime(), true, true)
      .delete();
  });
}

/**
 * Wraps the callback with a new ChangeTracker that can be used to revert
 * the changes
 *
 * @param {function(...args, {ChangeTracker}): Promise<mixed>} callback
 * @param {Number} [expiry]
 * @return {function(...args): Promise<mixed>}
 */
export function withChangeTracker(callback, expiry = 10 * 1000) {
  return function(...args) {
    const tracker = new ChangeTracker(expiry);

    return tracker
      .start()
      .then(() => callback.call(this, ...args, tracker))
      .then(results => tracker.stop().then(() => results))
      .catch(e => {
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
  constructor(expiry) {
    super();
    this.id = uuidv4();
    this.expiry = expiry;
    this._isBlocking = false;
    this._isTracking = false;
    this._isReverted = false;
    this._timeout = null;
  }

  /**
   * @return {boolean}
   */
  get tracking() {
    return this._isTracking;
  }

  /**
   * @return {boolean}
   */
  get reverted() {
    return this._isReverted;
  }

  /**
   * Start tracking changes
   * @return {ChangeTracker}
   */
  start() {
    if (this._isTracking) {
      return Promise.resolve();
    }

    this._isTracking = true;
    this._isBlocking = true;

    return db.transaction('rw', CHANGES_TABLE, CHANGE_LOCKS_TABLE, () => {
      return createLock(this, CHANGES_TABLE);
    });
  }

  /**
   * Stop tracking changes
   * @return {ChangeTracker}
   */
  stop() {
    this._isTracking = false;
    // This sets the expiry, from 0 to an actual expiry. The clock is ticking...
    return this.renew(this.expiry);
  }

  clearTimeout() {
    if (this._timeout) {
      // Clear the timeout for dismissing the lock, as we will dismiss
      // it once we are done reverting.
      clearTimeout(this._timeout);
    }
  }

  setTimeout() {
    this.clearTimeout();
    this._timeout = setTimeout(this.dismiss.bind(this), this.expiry);
  }

  /**
   * Extends the current safety delay by `milliseconds`
   *
   * @param {number} milliseconds
   */
  renew(milliseconds) {
    return getLocks({ tracker_id: this.id }).then(locks => {
      if (!locks.length) {
        throw new Error('Locks have expired');
      }

      const now = new Date();
      return ignoreTransaction(() => {
        return db[CHANGE_LOCKS_TABLE].bulkPut(
          locks.map(lock => {
            if (!lock.expiry) {
              lock.expiry = now.getTime();
            }
            lock.expiry += milliseconds;
            return lock;
          })
        ).then(() => this.setTimeout);
      });
    });
  }

  /**
   * Reverts all changes that have occurred while this was tracking
   *
   * @return {Promise}
   */
  revert() {
    if (this._isReverted) {
      return Promise.resolve();
    }

    if (!this._isBlocking) {
      throw new Error('Unable to revert changes without locks');
    }

    this.clearTimeout();

    this._isReverted = true;

    if (Dexie.currentTransaction) {
      if (Dexie.currentTransaction.source === REVERT_SOURCE) {
        return Promise.resolve();
      }

      // We're in the middle of a transaction, so just abort that
      Dexie.currentTransaction.abort();
      return Promise.resolve();
    }

    return getLocks({ tracker_id: this.id })
      .then(locks => {
        if (!locks.length) {
          throw new Error('Nothing to revert');
        }

        return promiseChunk(locks, 1, ([lock]) => {
          return this.doRevert(lock);
        });
      })
      .then(() => this.dismiss())
      .catch(e => {
        this.dismiss();
        return Promise.reject(e);
      });
  }

  doRevert(lock) {
    // As of writing this, this table should be `__changesForSyncing` or `__treeChangesForSyncing`
    const changeTable = db[lock.table_name];

    // First, we use our changes table to find all the changes since the "lock" started
    // using the `rev_start` which was set when we started tracking. The `rev` on the
    // table auto increments
    return db
      .transaction('rw', lock.table_name, () => {
        Dexie.currentTransaction.source = REVERT_SOURCE;
        return changeTable
          .where('rev')
          .above(lock.rev_start)
          .toArray()
          .then(changes => {
            return changeTable
              .where('rev')
              .above(lock.rev_start)
              .delete()
              .then(() => changes);
          });
      })
      .then(changes => {
        // Make sure we don't include changes with an ignored source, which are generally
        // just GET requests
        return changes.filter(change => !change.source.match(IGNORED_SOURCE));
      })
      .then(changes => {
        // Now that we have all the changes from our changes table, we'll go
        // one by one and revert each.
        //
        // R. Tibbles: I think this could be done in two queries (TODO)
        return promiseChunk(changes.reverse(), 1, ([change]) => {
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
      });
  }

  /**
   * Dismisses this tracker
   */
  dismiss() {
    return clearLocks({ tracker_id: this.id }).then(() => {
      if (this._isBlocking) {
        this._isBlocking = false;
        this.emit('unblocked');
      }
    });
  }
}
