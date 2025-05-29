// eslint-disable-next-line import/no-named-as-default
import Dexie from 'dexie';
import sortBy from 'lodash/sortBy';
import logging from '../logging';
import { CHANGE_TYPES, TABLE_NAMES } from './constants';
import db from './db';
import { INDEXEDDB_RESOURCES } from './registry';
import { RolesNames } from 'shared/leUtils/Roles';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

const {
  CREATED,
  DELETED,
  UPDATED,
  MOVED,
  PUBLISHED,
  PUBLISHED_NEXT,
  SYNCED,
  DEPLOYED,
  UPDATED_DESCENDANTS,
} = CHANGE_TYPES;

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
        [PUBLISHED_NEXT]: [],
        [SYNCED]: [],
        [DEPLOYED]: [],
        [UPDATED_DESCENDANTS]: [],
      };
    }
    collectedChanges[change.table][change.type].push(change);
  });
  return collectedChanges;
}

function sortChanges(changes) {
  return sortBy(changes, ['server_rev', 'rev']);
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
    return callback();
  });
}

/**
 * Class consolidating code related to mapping changes to the appropriate apply function
 * and logging related errors
 */
export class ChangeDispatcher {
  async apply(change) {
    let result = null;
    try {
      if (change.type === CHANGE_TYPES.CREATED && this.applyCreate) {
        result = await this.applyCreate(change);
      } else if (change.type === CHANGE_TYPES.UPDATED && this.applyUpdate) {
        result = await this.applyUpdate(change);
      } else if (change.type === CHANGE_TYPES.DELETED && this.applyDelete) {
        result = await this.applyDelete(change);
      } else if (change.type === CHANGE_TYPES.MOVED && this.applyMove) {
        result = await this.applyMove(change);
      } else if (change.type === CHANGE_TYPES.COPIED && this.applyCopy) {
        result = await this.applyCopy(change);
      } else if (change.type === CHANGE_TYPES.PUBLISHED && this.applyPublish) {
        result = await this.applyPublish(change);
      } else if (change.type === CHANGE_TYPES.UPDATED_DESCENDANTS && this.applyUpdateDescendants) {
        result = await this.applyUpdateDescendants(change);
      }
    } catch (e) {
      logging.error(e, {
        filename: 'change.json',
        // strip csrf token from headers
        data: JSON.stringify(change),
        contentType: 'application/json',
      });
    }
    return result;
  }
}

class ReturnedChanges extends ChangeDispatcher {
  /**
   * @param {CreatedChange} change
   * @return {Promise<void>}
   */
  applyCreate(change) {
    return transaction(change, () => {
      const table = db.table(change.table);
      return table
        .put(change.obj, !table.schema.primKey.keyPath ? change.key : undefined)
        .then(() => change.obj);
    });
  }

  /**
   * @param {UpdatedChange} change
   * @return {Promise<void>}
   */
  applyUpdate(change) {
    return transaction(change, () => {
      return db
        .table(change.table)
        .where(':id')
        .equals(change.key)
        .modify(obj => applyMods(obj, change.mods));
    });
  }

  /**
   * @param {DeletedChange} change
   * @return {Promise<void>}
   */
  applyDelete(change) {
    return transaction(change, () => {
      return db.table(change.table).delete(change.key);
    });
  }

  /**
   * @param {MovedChange} change
   * @return {Promise<void>}
   */
  applyMove(change) {
    const resource = INDEXEDDB_RESOURCES[change.table];
    if (!resource || !resource.tableMove) {
      return Promise.resolve();
    }

    const { key, target, position } = change;
    return resource.resolveTreeInsert({ id: key, target, position, isCreate: false }, data => {
      return transaction(change, () => {
        return resource.tableMove(data);
      });
    });
  }

  /**
   * @param {CopiedChange} change
   * @return {Promise<void>}
   */
  applyCopy(change) {
    const resource = INDEXEDDB_RESOURCES[change.table];
    if (!resource || !resource.tableCopy) {
      return Promise.resolve();
    }

    const { key, target, position, from_key } = change;
    // 1. Fetch `from_key` node from indexed DB, if not there then
    // only fetches from server.
    return resource.get(from_key, false).then(sourceNode => {
      // 2. Pass the node we get from above to `resolveTreeInsert` as sourceNode.
      // because its actually the "source" node.
      return resource.resolveTreeInsert(
        // copying takes the ID of the node to copy, so we use `from_key`.
        { id: from_key, target, position, isCreate: true, sourceNode: sourceNode },
        data => {
          return transaction(change, () => {
            // Update the ID on the payload to match the received change, since isCreate=true
            // would generate new IDs
            data.payload.id = key;
            return resource.tableCopy(data);
          });
        },
      );
    });
  }

  /**
   * @param {PublishedChange} change
   * @return {Promise<void>}
   */
  applyPublish(change) {
    if (change.table !== TABLE_NAMES.CHANNEL) {
      return Promise.resolve();
    }

    // Publish changes associate with the channel, but we open a transaction on contentnode
    return transaction(change, TABLE_NAMES.CONTENTNODE, TABLE_NAMES.CHANGES_TABLE, () => {
      return db
        .table(TABLE_NAMES.CONTENTNODE)
        .where({ channel_id: change.channel_id })
        .and(node => {
          const unpublishedNodeIds = db[TABLE_NAMES.CHANGES_TABLE]
            .where({ table: TABLE_NAMES.CONTENTNODE, key: node.id })
            .limit(1)
            .toArray();
          return unpublishedNodeIds.length === 0;
        })
        .modify({ changed: false, published: true });
    });
  }

  /**
   * @param {UpdatedDescendantsChange} change
   * @return {Promise<void>}
   */
  applyUpdateDescendants(change) {
    if (change.table !== TABLE_NAMES.CONTENTNODE) {
      return Promise.resolve();
    }

    const resource = INDEXEDDB_RESOURCES[TABLE_NAMES.CONTENTNODE];
    if (!resource || !resource.updateDescendants) {
      return Promise.resolve();
    }

    return transaction(change, TABLE_NAMES.CONTENTNODE, async () => {
      return resource.applyChangesToLoadedDescendants(change.key, change.mods);
    });
  }
}

/**
 * Updates aggregate counts on ancestors when a change occurs
 */
class ResourceCounts extends ChangeDispatcher {
  async apply(change) {
    // Resource counts are only applicable to content nodes
    if (change.table !== TABLE_NAMES.CONTENTNODE) {
      return null;
    }
    // When there's a current transaction, delay until it's complete
    if (Dexie.currentTransaction) {
      return new Promise((resolve, reject) => {
        Dexie.currentTransaction.on('complete', () => this.apply(change).then(resolve, reject));
      });
    }
    return super.apply(change);
  }

  /**
   * @return {ContentNode}
   */
  get resource() {
    return INDEXEDDB_RESOURCES[TABLE_NAMES.CONTENTNODE];
  }

  /**
   * @return {Dexie.Table}
   */
  get table() {
    return this.resource.table;
  }

  /**
   * Generates the diff to apply to ancestor nodes that updates their counts appropriately
   *
   * @typedef {{
   *  kind: string,
   *  total_count: number,
   *  resource_count: number,
   *  coach_count: number,
   *  role_visibility: string
   * }} Node
   * @param {Node} changedNode
   * @param {number} multiplier
   * @param {{total_count: number, resource_count: number, coach_count: number}} ancestor
   * @return {{total_count: number, resource_count: number, coach_count: number}}
   * @private
   */
  _applyDiff(changedNode, multiplier, ancestor) {
    const isFolder = changedNode.kind === ContentKindsNames.TOPIC;
    return {
      total_count: multiplier * (changedNode.total_count || 1) + ancestor.total_count,
      resource_count:
        multiplier * (isFolder ? changedNode.resource_count || 0 : 1) + ancestor.resource_count,
      coach_count:
        multiplier *
          (isFolder
            ? changedNode.coach_count || 0
            : Number(changedNode.role_visibility === RolesNames.COACH)) +
        ancestor.coach_count,
    };
  }

  /**
   * @param {CreatedChange} change
   * @return {Promise<void>}
   */
  async applyCreate(change) {
    await this.resource.updateAncestors(
      { id: change.key, ignoreChanges: true },
      this._applyDiff.bind(this, change.obj, 1),
    );
  }

  /**
   * @param {UpdatedChange} change
   * @return {Promise<void>}
   */
  async applyUpdate(change) {
    // If the role visibility hasn't changed, we don't need to update the ancestor counts
    if (!change.mods.role_visibility) {
      return;
    }

    await this.resource.updateAncestors({ id: change.key, ignoreChanges: true }, ancestor => {
      return {
        coach_count:
          ancestor.coach_count + (change.mods.role_visibility === RolesNames.COACH ? 1 : -1),
      };
    });
  }

  /**
   * @param {DeletedChange} change
   * @return {Promise<void>}
   */
  async applyDelete(change) {
    await this.resource.updateAncestors(
      { id: change.key, ignoreChanges: true },
      this._applyDiff.bind(this, change.oldObj, -1),
    );
  }

  /**
   * @param {MovedChange} change
   * @return {Promise<void>}
   */
  async applyMove(change) {
    // Only if the node is being moved to a new parent do we need to update the ancestor counts
    if (change.oldObj.parent === change.parent) {
      return;
    }

    const node = await this.table.get(change.key);
    await this.resource.updateAncestors(
      { id: change.oldObj.parent, includeSelf: true, ignoreChanges: true },
      this._applyDiff.bind(this, node, -1),
    );
    await this.resource.updateAncestors(
      { id: change.parent, includeSelf: true, ignoreChanges: true },
      this._applyDiff.bind(this, node, 1),
    );
  }

  /**
   * @param {CopiedChange} change
   * @return {Promise<void>}
   */
  async applyCopy(change) {
    const node = await this.table.get(change.key);
    await this.resource.updateAncestors(
      { id: change.key, ignoreChanges: true },
      this._applyDiff.bind(this, node, 1),
    );
  }
}

/**
 * A wrapper class that uses a WritableStream to queue, process, and apply changes to the database
 * through dispatcher class instances
 */
export class ChangeStream {
  /**
   * @param {ChangeDispatcher[]} dispatchers
   */
  constructor(dispatchers) {
    this._dispatchers = dispatchers;
    this._stream = null;
    this._writer = null;
  }

  /**
   * Delay initialization of the stream, otherwise this could get invoked before
   * the ponyfill is loaded in our Jest test environment
   */
  init() {
    this._stream = new WritableStream({
      write: change => this.doWrite(change),
    });
    this._writer = this._stream.getWriter();
  }

  /**
   * @param {Object[]} changes
   * @return {Promise<void>}
   */
  write(changes) {
    if (!this._stream) {
      this.init();
    }

    for (const change of sortChanges(changes)) {
      // write to the queue but not necessarily applied yet
      this._writer.write(change);
    }
    // return/await here ensures all changes are applied
    return this._writer.ready;
  }

  /**
   * @param {Object} change - A change object
   * @return {Promise<void>}
   */
  async doWrite(change) {
    for (const dispatcher of this._dispatchers) {
      await dispatcher.apply(change);
    }
  }
}

const returnedChanges = new ReturnedChanges();
/**
 * Export resourceCounts instance to update aggregate counts on ancestors when a change occurs
 * @type {ResourceCounts}
 */
export const resourceCounts = new ResourceCounts();
/**
 * Export changeStream instance to write returned changes to the database from sync requests
 * @type {ChangeStream}
 */
export const changeStream = new ChangeStream([returnedChanges, resourceCounts]);

/**
 * @see https://github.com/dfahlander/Dexie.js/blob/master/addons/Dexie.Syncable/src/apply-changes.js
 * @return {Promise<Array>}
 */
export default async function applyChanges(changes) {
  const results = [];
  for (const change of sortChanges(changes)) {
    const result = await returnedChanges.apply(change);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
