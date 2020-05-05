import Dexie from 'dexie';
import uuidv4 from 'uuid/v4';
import { EventEmitter } from 'events';
import db, { CLIENTID } from 'shared/data/db';
import { promiseChunk } from 'shared/utils';
import {
  CHANGE_LOCKS_TABLE,
  CHANGES_TABLE,
  TREE_CHANGES_TABLE,
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
      .between(0, now.getTime(), false, true)
      .delete();
  });
}

/**
 * Wraps the callback with a new ChangeTracker that can be used to revert
 * the changes
 *
 * @param {function(...args, {ChangeTracker}): Promise<mixed>} callback
 * @param {Number} expiry
 * @return {function(...args): Promise<mixed>}
 */
export function withChangeTracker(callback, expiry) {
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
  constructor(expiry = 10 * 1000) {
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

    return db.transaction('rw', CHANGES_TABLE, TREE_CHANGES_TABLE, CHANGE_LOCKS_TABLE, () => {
      return Promise.all([createLock(this, CHANGES_TABLE), createLock(this, TREE_CHANGES_TABLE)]);
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
        );
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
    const changeTable = db[lock.table_name];
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
      .then(changes => changes.filter(change => !change.source.match(IGNORED_SOURCE)))
      .then(changes => {
        return promiseChunk(changes.reverse(), 1, ([change]) => {
          const table = db[change.table];
          return db.transaction('rw', change.table, () => {
            Dexie.currentTransaction.source = REVERT_SOURCE;
            if (
              change.type === CHANGE_TYPES.CREATED ||
              change.type === CHANGE_TYPES.COPIED ||
              (change.type === CHANGE_TYPES.MOVED && !change.oldObj)
            ) {
              return table
                .where(table.schema.primKey.keyPath)
                .equals(change.key)
                .delete();
            } else if (
              change.type === CHANGE_TYPES.UPDATED ||
              change.type === CHANGE_TYPES.DELETED
            ) {
              return table.put(change.oldObj);
            } else if (change.type === CHANGE_TYPES.MOVED && change.oldObj) {
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
