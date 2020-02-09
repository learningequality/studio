import Dexie from 'dexie';
import findIndex from 'lodash/findIndex';
import matches from 'lodash/matches';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import uuidv4 from 'uuid/v4';
import channel from './broadcastChannel';
import {
  CHANGE_TYPES,
  FETCH_SOURCE,
  MESSAGES,
  MOVE_POSITIONS,
  MOVES_TABLE,
  STATUS,
} from './constants';
import db, { CLIENTID } from './db';
import client from 'shared/client';

const RESOURCES = {};

// Number of seconds after which data is considered stale.
const REFRESH_INTERVAL = 60;

const LAST_FETCHED = '__last_fetch';

// Custom uuid4 function to match our dashless uuids on the server side
function uuid4() {
  return uuidv4().replace(/-/g, '');
}

class Resource {
  constructor({
    tableName,
    urlName,
    idField = 'id',
    uuid = true,
    indexFields = [],
    syncable = true,
    ...options
  } = {}) {
    this.tableName = tableName;
    this.urlName = urlName;
    this.idField = idField;
    this.uuid = uuid;
    this.schema = [`${uuid ? '' : '++'}${idField}`, ...indexFields].join(',');
    this.indexFields = [idField, ...indexFields];
    this.syncable = syncable;
    RESOURCES[tableName] = this;
    // Allow instantiated resources to define their own custom properties and methods if needed
    // This is similar to how vue uses the options object to create a component definition
    // where 'this' ends up referring to the correct thing.
    const optionsDefinitions = Object.getOwnPropertyDescriptors(options);
    Object.keys(optionsDefinitions).forEach(key => {
      Object.defineProperty(this, key, optionsDefinitions[key]);
    });
  }

  get table() {
    return db[this.tableName];
  }

  /*
   * Transaction method used to invoke updates, creates and deletes
   * in a way that doesn't trigger listeners from the client that
   * initiated it by setting the CLIENTID.
   */
  transaction(mode, callback) {
    return db.transaction(mode, this.tableName, () => {
      Dexie.currentTransaction.source = CLIENTID;
      return callback();
    });
  }

  getUrlFunction(endpoint) {
    return window.Urls[`${this.urlName}_${endpoint}`];
  }

  modelUrl(id) {
    // Leveraging Django REST Framework generated URL patterns.
    return this.getUrlFunction('detail')(id);
  }

  collectionUrl() {
    // Leveraging Django REST Framework generated URL patterns.
    return this.getUrlFunction('list')();
  }

  makeRequest(request) {
    return new Promise((resolve, reject) => {
      const messageId = uuidv4();
      function handler(msg) {
        if (msg.messageId === messageId && msg.type === MESSAGES.REQUEST_RESPONSE) {
          channel.removeEventListener('message', handler);
          if (msg.status === STATUS.SUCCESS) {
            return resolve(msg.data);
          } else if (msg.status === STATUS.FAILURE && msg.err) {
            return reject(msg.err);
          }
          // Otherwise something unsepcified happened
          return reject();
        }
      }
      channel.addEventListener('message', handler);
      channel.postMessage({
        ...request,
        tableName: this.tableName,
        messageId,
      });
    });
  }

  requestCollection(params) {
    return this.makeRequest({
      type: MESSAGES.FETCH_COLLECTION,
      params,
    });
  }

  fetchCollection(params) {
    return client.get(this.collectionUrl(), { params }).then(response => {
      const now = Date.now();
      let itemData;
      let pageData;
      if (Array.isArray(response.data)) {
        itemData = response.data;
      } else {
        pageData = response.data;
        itemData = pageData.results;
      }
      const data = itemData.map(datum => {
        datum[LAST_FETCHED] = now;
        return datum;
      });
      return db.transaction('rw', this.tableName, () => {
        // Explicitly set the source of this as a fetch
        // from the server, to prevent us from trying
        // to sync these changes back to the server!
        Dexie.currentTransaction.source = FETCH_SOURCE;
        return this.table.bulkPut(data).then(() => {
          // If someone has requested a paginated response,
          // they will be expecting the page data object,
          // not the results object.
          return pageData ? pageData : itemData;
        });
      });
    });
  }

  where(params = {}) {
    const table = db[this.tableName];
    const whereParams = pick(params, this.indexFields);
    let collection;
    if (Object.keys(whereParams).length !== 0) {
      collection = table.where(whereParams);
    } else {
      collection = table.toCollection();
    }
    const filterParams = omit(params, this.indexFields);
    if (Object.keys(filterParams).length !== 0) {
      const filterFn = matches(filterParams);
      collection = collection.filter(filterFn);
    }
    return collection.toArray(objs => {
      if (!objs.length) {
        return this.requestCollection(params);
      }
      const now = Date.now();
      if (
        objs.some(obj => {
          const refresh = obj[LAST_FETCHED] + REFRESH_INTERVAL * 1000;
          return refresh < now;
        })
      ) {
        this.requestCollection(params);
      }
      return objs;
    });
  }

  requestModel(id) {
    return this.makeRequest({
      type: MESSAGES.FETCH_MODEL,
      id,
    });
  }

  fetchModel(id) {
    return client.get(this.modelUrl(id)).then(response => {
      const now = Date.now();
      const data = response.data;
      data[LAST_FETCHED] = now;
      return db.transaction('rw', this.tableName, () => {
        // Explicitly set the source of this as a fetch
        // from the server, to prevent us from trying
        // to sync these changes back to the server!
        Dexie.currentTransaction.source = FETCH_SOURCE;
        return this.table.put(data).then(() => {
          return data;
        });
      });
    });
  }

  get(id) {
    return this.table.get(id).then(obj => {
      if (obj) {
        return obj;
      }
      return this.requestModel(id);
    });
  }

  update(id, changes) {
    return this.transaction('rw', () => {
      return this.table.update(id, changes);
    });
  }

  modifyByIds(ids, changes) {
    return this.transaction('rw', () => {
      return this.table
        .where(this.idField)
        .anyOf(ids)
        .modify(changes);
    });
  }

  put(obj) {
    if (this.uuid && !obj[this.idField]) {
      obj[this.idField] = uuid4();
    }
    return this.transaction('rw', () => {
      return this.table.put(obj).then(id => {
        return id;
      });
    });
  }

  delete(id) {
    return this.transaction('rw', () => {
      return this.table.delete(id);
    });
  }
}

export const TABLE_NAMES = {
  CHANNEL: 'channel',
  CONTENTNODE: 'contentnode',
  CHANNELSET: 'channelset',
  TREE: 'tree',
  ASSESSMENTITEM: 'assessmentitem',
};

export const Channel = new Resource({
  tableName: TABLE_NAMES.CHANNEL,
  urlName: 'channel',
  indexFields: ['name', 'language'],
  searchCatalog(params) {
    params.page_size = params.page_size || 25;
    params.public = true;
    // Because this is a heavily cached endpoint, we can just directly request
    // it and rely on browser caching to prevent excessive requests to the server.
    return client.get(window.Urls[`catalog_list`](), { params }).then(response => {
      const pageData = response.data;
      const channelData = Array.isArray(pageData) ? pageData : pageData.results;
      return db.transaction('rw', this.tableName, () => {
        // Explicitly set the source of this as a fetch
        // from the server, to prevent us from trying
        // to sync these changes back to the server!
        Dexie.currentTransaction.source = FETCH_SOURCE;
        return this.table.bulkPut(channelData).then(() => {
          return pageData;
        });
      });
    });
  },
});

export const ContentNode = new Resource({
  tableName: TABLE_NAMES.CONTENTNODE,
  urlName: 'contentnode',
  indexFields: ['title', 'language'],
});

export const ChannelSet = new Resource({
  tableName: TABLE_NAMES.CHANNELSET,
  urlName: 'channelset',
});

export const AssessmentItem = new Resource({
  tableName: TABLE_NAMES.ASSESSMENTITEM,
  urlName: 'assessmentitem',
  idField: 'assessment_id',
  indexFields: ['contentnode'],
});

const validPositions = new Set(Object.values(MOVE_POSITIONS));

export const Tree = new Resource({
  tableName: TABLE_NAMES.TREE,
  urlName: 'tree',
  indexFields: ['channel_id', 'parent', '[channel_id+parent]'],
  // Any changes made to the tree table should only be propagated to the
  // backend via moves, so that we can make local tree changes in the frontend
  // and have them replicated in the backend on the global tree state.
  syncable: false,
  // ids have to exactly correlate with content node ids, so don't auto
  // set uuids on this table.
  uuid: false,
  tableMove(id, target, position) {
    if (validPositions.has(position)) {
      // This implements a 'parent local' algorithm
      // to produce locally consistent node moves
      let parentPromise;
      if (position === MOVE_POSITIONS.FIRST_CHILD || position === MOVE_POSITIONS.LAST_CHILD) {
        parentPromise = Promise.resolve(target);
      } else {
        parentPromise = this.table.get(target).then(node => {
          if (node) {
            return node.parent;
          } else {
            throw RangeError(`Target ${target} does not exist`);
          }
        });
      }
      return parentPromise.then(parent => {
        return this.table
          .where({ parent })
          .sortBy('sort_order')
          .then(nodes => {
            // Check if this is a no-op
            const targetNodeIndex = findIndex(nodes, { id: target });
            if (
              // We are trying to move it to the first child, and it is already the first child
              // when sorted by sort_order
              (position === MOVE_POSITIONS.FIRST_CHILD && nodes[0].id === id) ||
              // We are trying to move it to the last child, and it is already the last child
              // when sorted by sort_order
              (position === MOVE_POSITIONS.LAST_CHILD && nodes.slice(-1)[0].id === id) ||
              // We are trying to move it to the immediate left of the target node,
              // but it is already to the immediate left of the target node.
              (position === MOVE_POSITIONS.LEFT &&
                targetNodeIndex > 0 &&
                nodes[targetNodeIndex - 1].id === id) ||
              // We are trying to move it to the immediate right of the target node,
              // but it is already to the immediate right of the target node.
              (position === MOVE_POSITIONS.RIGHT &&
                targetNodeIndex < nodes.length - 2 &&
                nodes[targetNodeIndex + 1].id === id)
            ) {
              return;
            }
            let sort_order;
            if (position === MOVE_POSITIONS.FIRST_CHILD) {
              // For first child, just halve the first child sort order.
              sort_order = nodes[0].sort_order / 2;
            } else if (position === MOVE_POSITIONS.LAST_CHILD) {
              // For the last child, just add one to the final child sort order.
              sort_order = nodes.slice(-1)[0].sort_order + 1;
            } else if (position === MOVE_POSITIONS.LEFT) {
              // For left insertion, either find the middle value between the node that would be to
              // the left of the newly inserted node and the node that we are inserting to the
              // left of.
              // If the node we are inserting to the left of is already the leftmost node of this
              // parent, then we fallback to the same calculation as a first child insert.
              const leftSort = nodes[targetNodeIndex - 1]
                ? nodes[targetNodeIndex - 1].sort_order
                : 0;
              sort_order = (leftSort + nodes[targetNodeIndex].sort_order) / 2;
            } else if (position === MOVE_POSITIONS.RIGHT) {
              // For right insertion, similarly to left insertion, we find the middle value between
              // the node that will be to the right of the inserted node and the node we are
              // inserting to the right of.
              // If there is no node to the right, and the target node is already the rightmost
              // node, we produce a sort order value that is the same as we would calculate for a
              // last child insertion.
              const rightSort = nodes[targetNodeIndex + 1]
                ? nodes[targetNodeIndex + 1].sort_order
                : nodes[targetNodeIndex].sort_order + 2;
              sort_order = (nodes[targetNodeIndex].sort_order + rightSort) / 2;
            }
            let data = { parent, sort_order };
            return this.table
              .update(id, data)
              .then(updated => {
                if (updated) {
                  // Update succeeded
                  return { id, ...data };
                }
                // Update didn't succeed, this node probably doesn't exist, do a put instead,
                // but need to add in other parent info.
                return this.table.get(parent).then(parentNode => {
                  data = { id, parent, sort_order, tree_id: parentNode.tree_id };
                  return this.table.put(data);
                });
              })
              .then(() => {
                db[MOVES_TABLE].put({
                  key: id,
                  target,
                  position,
                  table: this.tableName,
                  type: CHANGE_TYPES.MOVED,
                });
                return data;
              });
          });
      });
    }
    return Promise.resolve();
  },
  move(id, target, position = 'first-child') {
    if (!validPositions.has(position)) {
      throw TypeError(`${position} is not a valid position`);
    }
    return db.transaction('rw', this.tableName, MOVES_TABLE, () => {
      Dexie.currentTransaction.source = CLIENTID;
      return this.tableMove(id, target, position);
    });
  },
});

export default RESOURCES;
