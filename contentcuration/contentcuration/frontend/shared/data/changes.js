import Dexie from 'dexie';
import uniq from 'lodash/uniq';
import uuidv4 from 'uuid/v4';
import { EventEmitter } from 'events';
import locks from './changeLocks';
import channel from './broadcastChannel';
import db from 'shared/data/db';
import { promiseChunk } from 'shared/utils';
import { CHANGES_TABLE, TREE_CHANGES_TABLE, REVERT_SOURCE, MESSAGES } from 'shared/data/constants';

/**
 * Ordered newest to oldest
 * @type {ChangeTracker[]}
 */
const changeTrackers = [];

/**
 * @return {ChangeTracker|null}
 */
export function getActiveChangeTracker() {
  return changeTrackers.find(tracker => tracker.tracking);
}

/**
 * @return {ChangeSet}
 */
export function getChangeSet() {
  const changeSet = new ChangeSet();
  const activeTracker = getActiveChangeTracker();

  if (activeTracker) {
    activeTracker.push(changeSet);
  }

  return changeSet;
}

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
    tracker.once('dismiss', () => {
      const trackerIndex = changeTrackers.findIndex(t => t.id === tracker.id);

      if (trackerIndex >= 0) {
        changeTrackers.splice(trackerIndex, 1);
      }
    });

    tracker.on('blocked', () => {
      locks.set(tracker.id, 1);
      channel.postMessage({ type: MESSAGES.BLOCK });
    });
    tracker.on('unblocked', () => {
      locks.remove(tracker.id);
      channel.postMessage({ type: MESSAGES.UNBLOCK });
    });

    // If we have more than one active, we nest it so "parent" tracker can
    // revert this, or this tracker alone can be reverted
    const lastActive = getActiveChangeTracker();
    if (lastActive) {
      lastActive.renew(tracker.safetyDelay);
      lastActive.push(tracker);
    }

    // Put it at the beginning so `getActiveChangeTracker` gets the last added
    changeTrackers.unshift(tracker);

    tracker.start();
    return callback
      .call(this, ...args, tracker)
      .then(results => {
        tracker.stop();
        return results;
      })
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
 * @return {ChangeTracker[]}
 */
export function getBlockingTrackers() {
  return changeTrackers.filter(tracker => tracker.blocking);
}

/**
 * Small wrapper around an individual change
 */
export class ChangeWrapper {
  constructor(change) {
    this._change = change;
  }

  /**
   * @return {string[]}
   */
  get tables() {
    return [this._change.table];
  }

  /**
   * @return {Promise}
   */
  revert() {
    return Promise.all([
      db[this._change.table].delete(this._change.key),
      db[CHANGES_TABLE].delete(this._change.rev),
      db[TREE_CHANGES_TABLE].delete(this._change.rev),
    ]);
  }
}

/**
 * Represents multiple changes
 */
export class ChangeSet extends EventEmitter {
  constructor() {
    super();
    this.id = uuidv4();
    this._changes = [];
  }

  /**
   * @return {string[]}
   */
  get tables() {
    return uniq(
      this._changes.reduce((tables, change) => {
        return tables.concat(...change.tables);
      }, [])
    );
  }

  /**
   * @param {ChangeWrapper[]} changes
   * @return {number}
   */
  push(...changes) {
    if (!this._isTracking) {
      return 0;
    }

    return this._changes.push(...changes);
  }

  /**
   * @return {Promise<mixed[]>}
   */
  revert() {
    return promiseChunk(this._changes, 1, changes => {
      return Promise.all(changes.map(change => change.revert()));
    }).then(results => {
      this.emit('revert');
      return results;
    });
  }
}

/**
 * Represents multiple changes, with the ability to start and stop tracking them,
 * and to block their synchronization to allow for also reverting them.
 */
export class ChangeTracker extends ChangeSet {
  constructor(safetyDelay) {
    super();
    this.safetyDelay = safetyDelay;
    this._hasStarted = false;
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
  get blocking() {
    return this._isBlocking;
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
    if (this._hasStarted && this._isTracking) {
      return this;
    } else if (this._hasStarted) {
      throw new Error('Cannot restart tracker');
    }

    this._hasStarted = true;
    this._isTracking = true;
    this._isBlocking = true;
    return this;
  }

  /**
   * Stop tracking changes
   * @return {ChangeTracker}
   */
  stop() {
    this._isTracking = false;

    this.emit('blocked');
    this.renew(this.safetyDelay);

    return this;
  }

  /**
   * @param {ChangeTracker[]|ChangeSet[]|object[]} changes
   * @return {number}
   */
  push(...changes) {
    // We should always already have a ChangeSet, but we'll be defensive anyway
    let lastChangeSet = this._changes.length
      ? this._changes[this._changes.length - 1]
      : new ChangeSet();

    changes = changes.filter(change => {
      if (change instanceof ChangeSet) {
        lastChangeSet = change;
        return true;
      }

      lastChangeSet.push(new ChangeWrapper(change));
      return false;
    });
    return super.push(...changes);
  }

  /**
   * Extends the current safety delay by `milliseconds`
   *
   * @param {number} milliseconds
   */
  renew(milliseconds) {
    if (this._isBlocking) {
      clearTimeout(this._timeout);
      this._timeout = setTimeout(() => this.dismiss(), milliseconds);
    } else {
      this.safetyDelay += milliseconds;
    }
  }

  /**
   * @return {Promise}
   */
  whenUnblocked() {
    if (!this._isBlocking && this._hasStarted) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.once('unblocked', resolve);
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
      throw new Error('Unable to revert changes while unblocked');
    }

    this._isReverted = true;
    clearTimeout(this._timeout);

    if (Dexie.currentTransaction) {
      // Must be a nested tracker
      if (Dexie.currentTransaction.source === REVERT_SOURCE) {
        return super.revert();
      }

      // We're in the middle of a transaction, so just abort that
      Dexie.currentTransaction.abort();
      return Promise.resolve();
    }

    return db
      .transaction('rw', ...this.tables, () => {
        Dexie.currentTransaction.source = REVERT_SOURCE;
        return super.revert();
      })
      .then(() => this.dismiss())
      .catch(e => {
        this.dismiss();
        return Promise.reject(e);
      });
  }

  /**
   * Dismisses this tracker
   */
  dismiss() {
    if (this._isBlocking) {
      this._isBlocking = false;
      this.emit('unblocked');
    }
  }
}
