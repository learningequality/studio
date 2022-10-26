import Dexie from 'dexie';
import Mutex from 'mutex-js';
import findIndex from 'lodash/findIndex';
import flatMap from 'lodash/flatMap';
import isArray from 'lodash/isArray';
import isNumber from 'lodash/isNumber';
import isString from 'lodash/isString';
import matches from 'lodash/matches';
import overEvery from 'lodash/overEvery';
import pick from 'lodash/pick';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';

import { v4 as uuidv4 } from 'uuid';
import {
  CHANGE_TYPES,
  CHANGES_TABLE,
  IGNORED_SOURCE,
  RELATIVE_TREE_POSITIONS,
  TABLE_NAMES,
  COPYING_FLAG,
  TASK_ID,
  CURRENT_USER,
  ACTIVE_CHANNELS,
  CHANNEL_SYNC_KEEP_ALIVE_INTERVAL,
  MAX_REV_KEY,
  LAST_FETCHED,
  CREATION_CHANGE_TYPES,
  TREE_CHANGE_TYPES,
} from './constants';
import applyChanges, { applyMods, collectChanges } from './applyRemoteChanges';
import mergeAllChanges from './mergeChanges';
import db, { channelScope, CLIENTID, Collection } from './db';
import { API_RESOURCES, INDEXEDDB_RESOURCES } from './registry';
import { DELAYED_VALIDATION, fileErrors, NEW_OBJECT } from 'shared/constants';
import client, { paramsSerializer } from 'shared/client';
import { currentLanguage } from 'shared/i18n';
import urls from 'shared/urls';

// Number of seconds after which data is considered stale.
const REFRESH_INTERVAL = 5;

const QUERY_SUFFIXES = {
  IN: 'in',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
};

const ORDER_FIELD = 'ordering';

const VALID_SUFFIXES = new Set(Object.values(QUERY_SUFFIXES));

const SUFFIX_SEPERATOR = '__';
const validPositions = new Set(Object.values(RELATIVE_TREE_POSITIONS));

const EMPTY_ARRAY = Symbol('EMPTY_ARRAY');

class Paginator {
  constructor(params) {
    // Get parameters for page number based pagination
    Object.assign(this, pick(params, 'page', 'page_size'));
    // At a minimum, this pagination style requires a page_size
    // parameter, so we check to see if that exists.
    if (this.page_size) {
      this.pageNumberType = true;
      this.page = this.page || 1;
    }
    // Get parameters for limit offset pagination
    Object.assign(this, pick(params, 'limit', 'offset'));
    // At a minimum, this pagination style requires a limit
    // parameter, so we check to see if that exists.
    if (this.limit) {
      this.limitOffsetType = true;
      this.offset = this.offset || 0;
    }
    if (this.pageNumberType && this.limitOffsetType) {
      console.warn(
        'Specified both page number type pagination and limit offset may get unexpected results'
      );
    }
  }
  paginate(collection) {
    let offset;
    let limit;
    if (this.pageNumberType) {
      offset = (this.page - 1) * this.page_size;
      limit = this.page_size;
    }
    if (this.limitOffsetType) {
      offset = this.offset;
      limit = this.limit;
    }
    if (isNumber(offset) && isNumber(limit)) {
      const countPromise = collection.count();
      const resultPromise = collection
        .offset(offset)
        .limit(limit)
        .toArray();
      return Promise.all([countPromise, resultPromise]).then(([count, results]) => {
        const out = { count, results };
        if (this.pageNumberType) {
          out.total_pages = Math.ceil(count / this.page_size);
          out.page = this.page;
        }
        return out;
      });
    }
    return collection.toArray();
  }
}

let vuexStore;

export function injectVuexStore(store) {
  vuexStore = store;
}

// Custom uuid4 function to match our dashless uuids on the server side
export function uuid4() {
  return uuidv4().replace(/-/g, '');
}

/*
 * Code to allow multiple inheritance in JS
 * modified from https://hacks.mozilla.org/2015/08/es6-in-depth-subclassing/
 */

function mix(...mixins) {
  // Inherit from the last class to allow constructor inheritance
  class Mix extends mixins.slice(-1)[0] {}

  // Programmatically add all the methods and accessors
  // of the mixins to class Mix.
  for (let mixin of mixins) {
    copyProperties(Mix, mixin);
    copyProperties(Mix.prototype, mixin.prototype);
  }
  return Mix;
}

function copyProperties(target, source) {
  for (let key of Reflect.ownKeys(source)) {
    if (key !== 'constructor' && key !== 'prototype' && key !== 'name') {
      let desc = Object.getOwnPropertyDescriptor(source, key);
      Object.defineProperty(target, key, desc);
    }
  }
}

function objectsAreStale(objs) {
  const now = Date.now();
  return objs.some(obj => {
    const refresh = obj[LAST_FETCHED] + REFRESH_INTERVAL * 1000;
    return refresh < now;
  });
}

class APIResource {
  constructor({ urlName, ...options }) {
    this.urlName = urlName;
    copyProperties(this, options);
    API_RESOURCES[urlName] = this;
  }

  getUrlFunction(endpoint) {
    return urls[`${this.urlName}_${endpoint}`];
  }

  modelUrl(id) {
    // Leveraging Django REST Framework generated URL patterns.
    return this.getUrlFunction('detail')(id);
  }

  collectionUrl() {
    // Leveraging Django REST Framework generated URL patterns.
    return this.getUrlFunction('list')();
  }

  fetchModel(id) {
    return client.get(this.modelUrl(id));
  }

  fetchCollection(params) {
    return client.get(this.collectionUrl(), { params });
  }
}

class IndexedDBResource {
  constructor({
    tableName,
    idField = 'id',
    uuid = true,
    indexFields = [],
    syncable = false,
    listeners = {},
    ...options
  } = {}) {
    this.tableName = tableName;
    // Don't allow resources with a compound index to have uuids
    this.uuid = uuid && idField.split('+').length === 1;
    this.schema = [idField, ...indexFields].join(',');
    this.rawIdField = idField;
    this.indexFields = new Set([idField, ...indexFields]);

    INDEXEDDB_RESOURCES[tableName] = this;
    copyProperties(this, options);
    // By default these resources do not sync changes to the backend.
    this.syncable = syncable;
    // An object for listening to specific change events on this resource in order to
    // allow for side effects from changes - should be a map of change type to handler function.
    this.listeners = listeners;
  }

  get table() {
    if (process.env.NODE_ENV !== 'production' && !db[this.tableName]) {
      /* eslint-disable no-console */
      console.error(
        `Tried to access table ${this.tableName} but it does not exist. Either requires a migration or clearing indexedDB`
      );
      /* eslint-enable */
    }
    return db[this.tableName];
  }

  get idField() {
    return this.table.schema.primKey.keyPath;
  }

  getIdValue(datum) {
    if (typeof this.idField === 'string') {
      return datum[this.idField];
    }
    return this.idField.map(f => datum[f]);
  }

  /*
   * Transaction method used to invoke updates, creates and deletes
   * in a way that doesn't trigger listeners from the client that
   * initiated it by setting the CLIENTID.
   */
  transaction({ mode = 'rw', source = null } = {}, ...extraTables) {
    const callback = extraTables.pop();
    if (source === null) {
      const channelScopeId = channelScope.id;
      source = channelScopeId === null ? CLIENTID : `${CLIENTID}::${channelScopeId}`;
    }
    return db.transaction(mode, this.tableName, ...extraTables, () => {
      Dexie.currentTransaction.source = source;
      return callback();
    });
  }

  setData(itemData) {
    const now = Date.now();
    // Explicitly set the source of this as a fetch
    // from the server, to prevent us from trying
    // to sync these changes back to the server!
    return this.transaction(
      { mode: 'rw', source: IGNORED_SOURCE },
      this.tableName,
      CHANGES_TABLE,
      () => {
        // Get any relevant changes that would be overwritten by this bulkPut
        return db[CHANGES_TABLE].where('[table+key]')
          .anyOf(itemData.map(datum => [this.tableName, this.getIdValue(datum)]))
          .sortBy('rev', changes => {
            changes = mergeAllChanges(changes, true);
            const collectedChanges = collectChanges(changes)[this.tableName] || {};
            for (let changeType of Object.keys(collectedChanges)) {
              const map = {};
              for (let change of collectedChanges[changeType]) {
                map[change.key] = change;
              }
              collectedChanges[changeType] = map;
            }
            const data = itemData
              .map(datum => {
                datum[LAST_FETCHED] = now;
                const id = this.getIdValue(datum);
                // If we have an updated change, apply the modifications here
                if (
                  collectedChanges[CHANGE_TYPES.UPDATED] &&
                  collectedChanges[CHANGE_TYPES.UPDATED][id]
                ) {
                  applyMods(datum, collectedChanges[CHANGE_TYPES.UPDATED][id].mods);
                }
                return datum;
                // If we have a deleted change, just filter out this object so we don't reput it
              })
              .filter(
                datum =>
                  !collectedChanges[CHANGE_TYPES.DELETED] ||
                  !collectedChanges[CHANGE_TYPES.DELETED][this.getIdValue(datum)]
              );
            return this.table.bulkPut(data).then(() => {
              // Move changes need to be reapplied on top of fetched data in case anything
              // has happened on the backend.
              return applyChanges(Object.values(collectedChanges[CHANGE_TYPES.MOVED] || {})).then(
                results => {
                  if (!results || !results.length) {
                    return data;
                  }
                  const resultsMap = {};
                  for (let result of results) {
                    const id = this.getIdValue(result);
                    resultsMap[id] = result;
                  }
                  return data
                    .map(datum => {
                      const id = this.getIdValue(datum);
                      if (resultsMap[id]) {
                        applyMods(datum, resultsMap[id]);
                      }
                      return datum;
                      // Concatenate any unsynced created objects onto
                      // the end of the returned objects
                    })
                    .concat(Object.values(collectedChanges[CHANGE_TYPES.CREATED]).map(c => c.obj));
                }
              );
            });
          });
      }
    );
  }

  where(params = {}) {
    const table = db[this.tableName];
    // Indexed parameters
    const whereParams = {};
    // Non-indexed parameters
    const filterParams = {};
    // Array parameters - ones that are filtering by 'in'
    const arrayParams = {};
    // Suffixed parameters - ones that are filtering by [gt/lt](e)
    const suffixedParams = {};
    // Field to sort by
    let sortBy;
    let reverse;

    // Setup paginator.
    const paginator = new Paginator(params);
    for (let key of Object.keys(params)) {
      // Partition our parameters
      const [rootParam, suffix] = key.split(SUFFIX_SEPERATOR);
      if (suffix && VALID_SUFFIXES.has(suffix) && suffix !== QUERY_SUFFIXES.IN) {
        // We have a suffix and it is for an operation that isn't IN
        suffixedParams[rootParam] = suffixedParams[rootParam] || {};
        suffixedParams[rootParam][suffix] = params[key];
      } else if (this.indexFields.has(rootParam)) {
        if (suffix === QUERY_SUFFIXES.IN) {
          // We have a suffix for an IN operation
          arrayParams[rootParam] = params[key];
        } else if (!suffix) {
          whereParams[rootParam] = params[key];
        }
      } else if (key === ORDER_FIELD) {
        const ordering = params[key];
        if (ordering.indexOf('-') === 0) {
          sortBy = ordering.substring(1);
          reverse = true;
        } else {
          sortBy = ordering;
        }
      } else if (!paginator[key]) {
        // Don't filter by parameters that are used for pagination
        filterParams[rootParam] = params[key];
      }
    }
    let collection;
    if (Object.keys(arrayParams).length !== 0) {
      if (Object.keys(arrayParams).length === 1) {
        const anyOf = Object.values(arrayParams)[0];
        if (anyOf.length === 0) {
          if (process.env.NODE_ENV !== 'production') {
            /* eslint-disable no-console */
            console.warn(`Tried to query ${Object.keys(arrayParams)[0]} with no values`);
          }
          return Promise.resolve(EMPTY_ARRAY);
        }
        const keyPath = Object.keys(arrayParams)[0];
        collection = table.where(keyPath).anyOf(Object.values(arrayParams)[0]);
        if (process.env.NODE_ENV !== 'production') {
          // Flag a warning if we tried to filter by an Array and other where params
          if (Object.keys(whereParams).length > 1) {
            /* eslint-disable no-console */
            console.warn(
              `Tried to query ${Object.keys(whereParams).join(
                ', '
              )} alongside array parameters which is not currently supported`
            );
            /* eslint-enable */
          }
        }
        Object.assign(filterParams, whereParams);
        if (sortBy === keyPath) {
          sortBy = null;
        }
      } else if (Object.keys(arrayParams).length > 1) {
        if (process.env.NODE_ENV !== 'production') {
          // Flag a warning if we tried to filter by an Array and other where params
          /* eslint-disable no-console */
          console.warn(
            `Tried to query multiple __in params ${Object.keys(arrayParams).join(
              ', '
            )} which is not currently supported`
          );
          /* eslint-enable */
        }
      }
    } else if (Object.keys(whereParams).length > 0) {
      collection = table.where(whereParams);
      if (whereParams[sortBy] && Object.keys(whereParams).length === 1) {
        // If there is only one where parameter, then the collection should already be sorted
        // by the index that it was queried by.
        // https://dexie.org/docs/Collection/Collection.sortBy()#remarks
        sortBy = null;
      }
    } else {
      if (sortBy && this.indexFields.has(sortBy) && !reverse) {
        collection = table.orderBy(sortBy);
        sortBy = null;
      } else {
        collection = table.toCollection();
      }
    }
    let filterFn;
    if (Object.keys(filterParams).length !== 0) {
      filterFn = matches(filterParams);
    }
    if (Object.keys(suffixedParams).length !== 0) {
      // Reassign the filterFn to be a combination of all the suffixed parameter filters
      // we are applying here, so require that the item passes all the operations
      // hence, overEvery.
      filterFn = overEvery(
        [
          // First generate a flat array of all suffix parameter filter functions
          ...flatMap(
            Object.keys(suffixedParams),
            // First we iterate over the specific parameters we are filtering over
            key => {
              // Then we iterate over the suffixes that we are filtering over
              return Object.keys(suffixedParams[key]).map(suffix => {
                // For each suffix, we have a specific value
                const value = suffixedParams[key][suffix];
                // Now return a filter function depending on the specific
                // suffix that we have passed.
                if (suffix === QUERY_SUFFIXES.LT) {
                  return item => item[key] < value;
                } else if (suffix === QUERY_SUFFIXES.LTE) {
                  return item => item[key] <= value;
                } else if (suffix === QUERY_SUFFIXES.GT) {
                  return item => item[key] > value;
                } else if (suffix === QUERY_SUFFIXES.GTE) {
                  return item => item[key] >= value;
                }
                // Because of how we are initially generating these
                // we should never get to here and returning undefined
              });
            }
          ),
          // If there are filter Params, this will be defined
          filterFn,
          // If there were not, it will be undefined and filtered by the final filter
          // In addition, in the unlikely case that the suffix was not recognized,
          // this will filter out those cases too.
        ].filter(f => f)
      );
    }
    if (filterFn) {
      collection = collection.filter(filterFn);
    }
    if (sortBy) {
      if (reverse) {
        collection = collection.reverse();
      }
      collection = collection.sortBy(sortBy);
    }
    return paginator.paginate(collection);
  }

  get(id) {
    return this.table.get(id);
  }

  /**
   * Method to remove the NEW_OBJECT and DELAYED_VALIDATION symbols
   * property so we don't commit it to IndexedDB
   * @param {Object} obj
   * @return {Object}
   */
  _cleanNew(obj) {
    const out = {
      ...obj,
    };
    delete out[NEW_OBJECT];
    delete out[DELAYED_VALIDATION];
    return out;
  }

  update(id, changes) {
    return this.transaction({ mode: 'rw' }, () => {
      return this.table.update(id, this._cleanNew(changes));
    });
  }

  modifyByIds(ids, changes) {
    return this.transaction({ mode: 'rw' }, () => {
      return this.table
        .where(this.rawIdField)
        .anyOf(ids)
        .modify(this._cleanNew(changes));
    });
  }

  /**
   * @param {Object|Collection} query
   * @return {Promise<mixed[]>}
   */
  _resolveQuery(query) {
    return new Promise(resolve => {
      if (query instanceof Collection) {
        resolve(query.toArray());
      } else if (query instanceof Dexie.Promise || query instanceof Promise || isArray(query)) {
        resolve(query);
      } else {
        resolve(this.where(query));
      }
    });
  }
  /**
   * Method to synchronously return a new object
   * suitable for insertion into IndexedDB but
   * without actually inserting it
   * @param {Object} obj
   * @return {Object}
   */
  createObj(obj) {
    return {
      ...this._preparePut(obj),
      [NEW_OBJECT]: true,
    };
  }

  _preparePut(obj) {
    const idMap = this._prepareCopy({});
    return this._cleanNew({
      ...idMap,
      ...obj,
    });
  }

  /**
   * @param {Object} obj
   * @return {Promise<string>}
   */
  put(obj) {
    return this.transaction({ mode: 'rw' }, () => {
      return this.table.put(this._preparePut(obj));
    });
  }

  /**
   * @param {Object[]} objs
   * @return {Promise<string[]>}
   */
  bulkPut(objs) {
    const putObjs = objs.map(this._preparePut);
    return this.transaction({ mode: 'rw' }, () => {
      return this.table.bulkPut(putObjs);
    });
  }

  /**
   * @param {Object} original
   * @return {Object}
   * @private
   */
  _prepareCopy(original) {
    const id = this.uuid ? { [this.idField]: uuid4() } : {};

    return this._cleanNew({
      ...original,
      ...id,
    });
  }

  delete(id) {
    return this.transaction({ mode: 'rw' }, () => {
      return this.table.delete(id);
    });
  }

  /**
   * Set the channel_id property on a change
   * object before we put it in the store, if relevant
   * @param {Object} change
   * @returns {Object}
   */
  setChannelIdOnChange(change) {
    return change;
  }

  /**
   * Set the user_id property on a change
   * object before we put it in the store, if relevant
   * @param {Object} change
   * @returns {Object}
   */
  setUserIdOnChange(change) {
    return change;
  }
}

class Resource extends mix(APIResource, IndexedDBResource) {
  constructor({ urlName, syncable = true, ...options } = {}) {
    super(options);
    this.urlName = urlName;
    API_RESOURCES[urlName] = this;
    // Overwrite the false default for IndexedDBResource
    this.syncable = syncable;
    // A map of stringified request params to a last fetched time and a promise
    this._requests = {};
  }

  fetchCollection(params) {
    const now = Date.now();
    const queryString = paramsSerializer(params);
    const cachedRequest = this._requests[queryString];
    if (
      cachedRequest &&
      cachedRequest[LAST_FETCHED] &&
      cachedRequest[LAST_FETCHED] + REFRESH_INTERVAL * 1000 > now &&
      cachedRequest.promise
    ) {
      return cachedRequest.promise;
    }
    const promise = client.get(this.collectionUrl(), { params }).then(response => {
      let itemData;
      let pageData;
      if (Array.isArray(response.data)) {
        itemData = response.data;
      } else if (response.data && response.data.results) {
        pageData = response.data;
        itemData = pageData.results;
      } else {
        console.error(`Unexpected response from ${this.urlName}`, response);
        itemData = [];
      }
      return this.setData(itemData).then(data => {
        // setData also applies any outstanding local change events to the data
        // so we return the data returned from setData to make sure the most up to date
        // representation is returned from the fetch.
        if (pageData) {
          pageData.results = data;
        }
        // If someone has requested a paginated response,
        // they will be expecting the page data object,
        // not the results object.
        return pageData ? pageData : data;
      });
    });
    this._requests[queryString] = {
      [LAST_FETCHED]: now,
      promise,
    };
    return promise;
  }

  /**
   * @param {Object} params
   * @param {Boolean} [doRefresh=true] -- Whether or not to refresh async from server
   * @return {Promise<Object[]>}
   */
  where(params = {}, doRefresh = true) {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      /* eslint-disable no-console */
      console.groupCollapsed(`Getting data for ${this.tableName} table with params: `, params);
      console.trace();
      console.groupEnd();
      /* eslint-enable */
    }
    return super.where(params).then(objs => {
      if (objs === EMPTY_ARRAY) {
        return [];
      }
      // if there are no objects, and it's also not an empty paginated response (objs.count),
      // or we mean to refresh
      if ((!objs.length && !objs.count) || doRefresh) {
        let refresh = Promise.resolve(true);
        // ContentNode tree operations are the troublemakers causing the logic below
        if (this.tableName === TABLE_NAMES.CONTENTNODE) {
          // Only fetch new updates if we don't have pending changes to ContentNode that
          // affect tree structure
          refresh = db[CHANGES_TABLE].where('table')
            .equals(TABLE_NAMES.CONTENTNODE)
            .filter(c => TREE_CHANGE_TYPES.includes(c.type))
            .count()
            .then(pendingCount => pendingCount === 0);
        }

        const fetch = refresh.then(shouldFetch => {
          return shouldFetch ? this.fetchCollection(params) : [];
        });
        // Be sure to return the fetch promise to relay fetched objects in this condition
        if (!objs.length && !objs.count) {
          return fetch;
        }
      }
      return objs;
    });
  }

  headModel(id) {
    // If the resource identified by `id` has just been created, but we haven't verified
    // the server has applied the change yet, we skip making the HEAD request for it
    return db[CHANGES_TABLE].where('[table+key]')
      .equals([this.tableName, id])
      .filter(c => CREATION_CHANGE_TYPES.includes(c.type))
      .count()
      .then(pendingCount => {
        if (pendingCount === 0) {
          return client.head(this.modelUrl(id));
        }
      });
  }

  fetchModel(id) {
    return client.get(this.modelUrl(id)).then(response => {
      return this.setData([response.data]).then(data => data[0]);
    });
  }

  createModel(data) {
    return client.post(this.collectionUrl(), data).then(response => {
      const now = Date.now();
      const data = response.data;
      data[LAST_FETCHED] = now;
      // Explicitly set the source of this as a fetch
      // from the server, to prevent us from trying
      // to sync these changes back to the server!
      return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
        return this.table.put(data).then(() => {
          return data;
        });
      });
    });
  }

  deleteModel(id) {
    return client.delete(this.modelUrl(id)).then(() => {
      // Explicitly set the source of this as a fetch
      // from the server, to prevent us from trying
      // to sync these changes back to the server!
      return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
        return this.table.delete(id).then(() => {
          return true;
        });
      });
    });
  }

  /**
   * @param {String} id
   * @param {Boolean} [doRefresh=true] -- Whether or not to refresh async from server
   * @return {Promise<{}|null>}
   */
  get(id, doRefresh = true) {
    if (!isString(id)) {
      return Promise.reject('Only string ID format is supported');
    }

    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      /* eslint-disable no-console */
      console.groupCollapsed(`Getting instance for ${this.tableName} table with id: ${id}`);
      console.trace();
      console.groupEnd();
      /* eslint-enable */
    }
    return this.table.get(id).then(obj => {
      if (!obj || doRefresh) {
        const request = this.fetchModel(id);
        if (!obj) {
          return request;
        }
      }

      return obj;
    });
  }
}

/**
 * Tree resources mixin
 */
export class TreeResource extends Resource {
  constructor(...args) {
    super(...args);
    this._locks = {};
  }

  /**
   * Locks a treeId so we can be sure nothing changes while we're computing a new tree position
   *
   * @param {Number} id
   * @param {Function} callback
   * @return {Promise}
   */
  treeLock(id, callback) {
    if (!(id in this._locks)) {
      this._locks[id] = new Mutex();
    }

    return this._locks[id].lock(callback);
  }

  /**
   * @param {string} id
   * @param {string} target
   * @param {string} position
   * @param {Object[]} siblings
   * @return {null|number}
   */
  getNewSortOrder(id, target, position, siblings) {
    if (!siblings.length) {
      return 1;
    }

    // Check if this is a no-op
    siblings = sortBy(siblings, 'lft');
    const targetNodeIndex = findIndex(siblings, { id: target });

    if (
      // We are trying to move it to the first child, and it is already the first child
      // when sorted by lft
      (position === RELATIVE_TREE_POSITIONS.FIRST_CHILD && siblings[0].id === id) ||
      // We are trying to move it to the last child, and it is already the last child
      // when sorted by lft
      (position === RELATIVE_TREE_POSITIONS.LAST_CHILD && siblings.slice(-1)[0].id === id) ||
      // We are trying to move it to the immediate left of the target node,
      // but it is already to the immediate left of the target node.
      (position === RELATIVE_TREE_POSITIONS.LEFT &&
        targetNodeIndex > 0 &&
        siblings[targetNodeIndex - 1].id === id) ||
      // We are trying to move it to the immediate right of the target node,
      // but it is already to the immediate right of the target node.
      (position === RELATIVE_TREE_POSITIONS.RIGHT &&
        targetNodeIndex < siblings.length - 1 &&
        siblings[targetNodeIndex + 1].id === id)
    ) {
      return null;
    }

    if (position === RELATIVE_TREE_POSITIONS.FIRST_CHILD) {
      // For first child, just halve the first child sort order.
      return siblings[0].lft / 2;
    } else if (position === RELATIVE_TREE_POSITIONS.LAST_CHILD) {
      // For the last child, just add one to the final child sort order.
      return siblings.slice(-1)[0].lft + 1;
    } else if (position === RELATIVE_TREE_POSITIONS.LEFT) {
      // For left insertion, either find the middle value between the node that would be to
      // the left of the newly inserted node and the node that we are inserting to the
      // left of.
      // If the node we are inserting to the left of is already the leftmost node of this
      // parent, then we fallback to the same calculation as a first child insert.
      const leftSort = siblings[targetNodeIndex - 1] ? siblings[targetNodeIndex - 1].lft : 0;
      return (leftSort + siblings[targetNodeIndex].lft) / 2;
    } else if (position === RELATIVE_TREE_POSITIONS.RIGHT) {
      // For right insertion, similarly to left insertion, we find the middle value between
      // the node that will be to the right of the inserted node and the node we are
      // inserting to the right of.
      // If there is no node to the right, and the target node is already the rightmost
      // node, we produce a sort order value that is the same as we would calculate for a
      // last child insertion.
      const rightSort = siblings[targetNodeIndex + 1]
        ? siblings[targetNodeIndex + 1].lft
        : siblings[targetNodeIndex].lft + 2;
      return (siblings[targetNodeIndex].lft + rightSort) / 2;
    }

    return null;
  }
}

export const Session = new IndexedDBResource({
  tableName: TABLE_NAMES.SESSION,
  idField: CURRENT_USER,
  uuid: false,
  listeners: {
    [CHANGE_TYPES.DELETED]: function() {
      if (!window.location.pathname.endsWith(urls.accounts())) {
        window.location = urls.accounts();
      }
    },
  },
  get currentChannel() {
    return window.CHANNEL_EDIT_GLOBAL || {};
  },
  get currentChannelId() {
    return this.currentChannel.channel_id || null;
  },
  channelSyncKeepAlive() {
    if (this.currentChannelId && document.hasFocus()) {
      this.updateSession({ [`${ACTIVE_CHANNELS}.${this.currentChannelId}`]: Date.now() });
    }
  },
  monitorKeepAlive() {
    if (this.currentChannelId) {
      this.channelSyncKeepAlive();
      if (!this._keepAliveInterval) {
        this._keepAliveInterval = setInterval(
          () => this.channelSyncKeepAlive(),
          CHANNEL_SYNC_KEEP_ALIVE_INTERVAL
        );
      }
    }
  },
  stopMonitorKeepAlive() {
    if (this._keepAliveInterval) {
      clearInterval(this._keepAliveInterval);
      this._keepAliveInterval = null;
    }
  },
  async setChannelScope() {
    const channelId = this.currentChannelId;
    if (channelId) {
      channelScope.id = channelId;
      const channelRev = (window.CHANNEL_EDIT_GLOBAL || {}).channel_rev || 0;
      // N.B. key paths produce nested updates in Dexie.js when using the update method,
      // as in the `updateSession` method below.
      await this.updateSession({
        [`${MAX_REV_KEY}.${channelId}`]: channelRev,
      });
      this.monitorKeepAlive();
      window.addEventListener('focus', () => this.monitorKeepAlive());
      window.addEventListener('blur', () => this.stopMonitorKeepAlive());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopMonitorKeepAlive();
        } else {
          this.monitorKeepAlive();
        }
      });
    }
  },
  async getSession() {
    return this.get(CURRENT_USER);
  },
  setSession(currentUser) {
    return this.put({ CURRENT_USER, ...currentUser });
  },
  updateSession(currentUser) {
    return this.update(CURRENT_USER, currentUser);
  },
});

export const Bookmark = new Resource({
  tableName: TABLE_NAMES.BOOKMARK,
  urlName: 'bookmark',
  idField: 'channel',
  setUserIdOnChange(change) {
    if (vuexStore) {
      change.user_id = vuexStore.getters.currentUserId;
    }
  },
});

export const Channel = new Resource({
  tableName: TABLE_NAMES.CHANNEL,
  urlName: 'channel',
  indexFields: ['name', 'language'],
  searchCatalog(params) {
    params.page_size = params.page_size || 100;
    params.public = true;
    // Because this is a heavily cached endpoint, we can just directly request
    // it and rely on browser caching to prevent excessive requests to the server.
    return client.get(urls.catalog_list(), { params }).then(response => {
      return response.data;
    });
  },
  getCatalogChannel(id) {
    // Because this is a heavily cached endpoint, we can just directly request
    // it and rely on browser caching to prevent excessive requests to the server.
    return client.get(urls.catalog_detail(id)).then(response => {
      return response.data;
    });
  },

  /**
   * Ensure we merge content defaults when calling `update`
   *
   * @param {String} id
   * @param {Object} [content_defaults]
   * @param {Object} changes
   * @return {Promise}
   */
  update(id, { content_defaults = {}, ...changes }) {
    return this.transaction({ mode: 'rw' }, () => {
      return this.table
        .where('id')
        .equals(id)
        .modify(channel => {
          if (Object.keys(content_defaults).length) {
            if (!channel.content_defaults) {
              channel.content_defaults = {};
            }
            Object.assign(channel.content_defaults, content_defaults);
          }

          Object.assign(channel, changes);
        });
    });
  },

  updateAsAdmin(id, changes) {
    return client.patch(window.Urls.adminChannelsDetail(id), changes).then(() => {
      return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
        return this.table.update(id, changes);
      });
    });
  },

  publish(id, version_notes) {
    return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
      return this.table.update(id, { publishing: true });
    }).then(() => {
      const change = {
        key: id,
        version_notes,
        language: currentLanguage,
        source: CLIENTID,
        table: this.tableName,
        type: CHANGE_TYPES.PUBLISHED,
        channel_id: id,
      };
      return this.transaction(
        { mode: 'rw', source: IGNORED_SOURCE },
        CHANGES_TABLE,
        TABLE_NAMES.CONTENTNODE,
        () => {
          return Promise.all([
            db[CHANGES_TABLE].put(change),
            ContentNode.table.where({ channel_id: id }).modify({
              changed: false,
              published: true,
              has_new_descendants: false,
              has_updated_descendants: false,
            }),
          ]);
        }
      );
    });
  },

  sync(id, { attributes = false, tags = false, files = false, assessment_items = false } = {}) {
    const change = {
      key: id,
      attributes,
      tags,
      files,
      assessment_items,
      source: CLIENTID,
      table: this.tableName,
      type: CHANGE_TYPES.SYNCED,
      channel_id: id,
    };
    return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, CHANGES_TABLE, () => {
      return db[CHANGES_TABLE].put(change);
    });
  },

  softDelete(id) {
    let modelUrl = this.modelUrl(id);
    // Call endpoint directly in case we need to navigate to new page
    return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
      return this.table.update(id, { deleted: true });
    }).then(() => {
      // make sure transaction is closed before calling a non-Dexie async function
      // see here: https://bit.ly/3dJtsIe
      return client.delete(modelUrl);
    });
  },
  setChannelIdOnChange(change) {
    // For channels, the appropriate channel_id for a change is just the key
    change.channel_id = change.key;
  },
});

function setChannelIdFromTransactionSource(change) {
  const channel_id = change.source.split('::').slice(1)[0];
  if (channel_id) {
    change.channel_id = channel_id;
  }
}

export const ContentNodePrerequisite = new IndexedDBResource({
  tableName: TABLE_NAMES.CONTENTNODE_PREREQUISITE,
  indexFields: ['target_node', 'prerequisite'],
  idField: '[target_node+prerequisite]',
  uuid: false,
  syncable: true,
  setChannelIdOnChange: setChannelIdFromTransactionSource,
});

export const ContentNode = new TreeResource({
  tableName: TABLE_NAMES.CONTENTNODE,
  urlName: 'contentnode',
  indexFields: [
    'title',
    'language',
    'parent',
    'channel_id',
    'node_id',
    'root_id',
    'lft',
    '[root_id+parent]',
    '[node_id+channel_id]',
  ],

  addPrerequisite(target_node, prerequisite) {
    if (target_node === prerequisite) {
      return Promise.reject('No self referential prerequisites');
    }
    // First check we have no local record of the inverse
    return ContentNodePrerequisite.get([prerequisite, target_node]).then(entry => {
      if (entry) {
        return Promise.reject('No cyclic prerequisites');
      }
      return ContentNodePrerequisite.put({
        target_node,
        prerequisite,
      });
    });
  },

  removePrerequisite(target_node, prerequisite) {
    return ContentNodePrerequisite.delete([target_node, prerequisite]);
  },

  queryRequisites(ids) {
    return ContentNodePrerequisite.table
      .where('target_node')
      .anyOf(ids)
      .or('prerequisite')
      .anyOf(ids)
      .toArray();
  },

  recurseRequisites(ids, visited = null) {
    if (visited === null) {
      visited = new Set([ids]);
    } else {
      visited = new Set(Array.from(visited).concat(ids));
    }
    return this.queryRequisites(ids).then(entries => {
      const entryIds = uniq(flatMap(entries, e => [e.target_node, e.prerequisite])).filter(
        id => !visited.has(id)
      );
      if (entryIds.length) {
        return this.recurseRequisites(entryIds, visited).then(nextEntries => {
          return entries.concat(nextEntries);
        });
      }
      return entries;
    });
  },

  getRequisites(id) {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      /* eslint-disable no-console */
      console.groupCollapsed(`Getting prerequisite data for ${this.tableName} table with id: `, id);
      console.trace();
      console.groupEnd();
      /* eslint-enable */
    }

    const fetchPromise = this.fetchRequisites(id);
    return this.recurseRequisites([id]).then(entries => {
      if (entries.length) {
        return uniqBy(entries, e => e.target_node + e.prerequisite);
      }
      return fetchPromise;
    });
  },

  fetchRequisites(id) {
    return client.get(this.getUrlFunction('requisites')(id)).then(response => {
      return ContentNodePrerequisite.setData(response.data).then(() => {
        return response.data;
      });
    });
  },

  /**
   * @param {string} id -- The node PK
   * @returns {{ size: Number, stale: Boolean, changes: [{key: string}]}}
   */
  getResourceSize(id) {
    return client.get(this.getUrlFunction('size')(id)).then(response => response.data);
  },

  /**
   * Resolves target ID string into parent object, based off position, for tree inserts
   *
   * @param {string} target
   * @param {string} position
   * @return {Promise<Object>}
   */
  resolveParent(target, position) {
    if (!validPositions.has(position)) {
      return Promise.reject(new TypeError(`"${position}" is an invalid position`));
    }

    return this.get(target, false)
      .then(node => {
        if (
          position === RELATIVE_TREE_POSITIONS.FIRST_CHILD ||
          position === RELATIVE_TREE_POSITIONS.LAST_CHILD
        ) {
          return node;
        }

        target = node.parent;
        return node ? this.get(target, false) : null;
      })
      .then(node => {
        if (!node) {
          throw new RangeError(`Target ${target} does not exist`);
        }

        return node;
      });
  },

  /**
   * Resolves data required for a tree insert operation and passes it to the callback, which should
   * perform the update and return a Promise.
   *
   * The tree operation references a node by `id`, which will be inserted to `position` of `target`.
   * If the node is being explicitly created (not moved), then pass `isCreate=true`. Lastly, the
   * callback is passed the results of the resolving the tree insert, while locking the tree
   * locally so we can ensure we have orderly operations
   *
   * @template {Object} ContentNode
   * @param {string} id
   * @param {string} target
   * @param {string} position
   * @param {Boolean} isCreate
   * @param {Function<Promise<ContentNode>>} callback
   * @return {Promise<ContentNode>}
   */
  resolveTreeInsert(id, target, position, isCreate, callback) {
    // First, resolve parent so we can determine the sort order, but also to determine
    // the tree so we can temporarily lock it while we determine those values locally
    return this.resolveParent(target, position).then(parent => {
      if (id === parent.id) {
        throw new RangeError(`Cannot set node as child of itself`);
      }

      // Using root_id, we'll keep this locked while we handle this, so no other operations
      // happen while we're potentially waiting for some data we need (siblings, source node)
      return this.treeLock(parent.root_id, () => {
        // Don't trigger fetch, if this is specified as a creation
        const getNode = isCreate ? this.table.get(id) : this.get(id, false);

        // Preload the ID we're referencing, and get siblings to determine sort order
        return Promise.all([getNode, this.where({ parent: parent.id }, false)]).then(
          ([node, siblings]) => {
            let lft = 1;
            if (siblings.length) {
              // If we're creating, we don't need to worry about passing the ID
              lft = this.getNewSortOrder(isCreate ? null : id, target, position, siblings);
            } else {
              // if there are no siblings, overwrite
              target = parent.id;
              position = RELATIVE_TREE_POSITIONS.LAST_CHILD;
            }

            if (lft === null) {
              return Promise.reject(new RangeError('New lft value evaluated to null'));
            }

            // Prep the bare minimum update payload
            const payload = {
              id: isCreate ? uuid4() : id,
              parent: parent.id,
              root_id: parent.root_id,
              lft,
              changed: true,
            };

            let channel_id = parent.channel_id;

            // This should really only happen when this is a move operation to the trash tree.
            // Other cases like copying shouldn't encounter this because they should always have the
            // channel_id on the destination. The trash tree root node does not have the channel_id
            // annotated on it, and using the source node's channel_id should be reliable
            // in that case
            if (!channel_id && node) {
              channel_id = node.channel_id;

              // The change would be disallowed anyway, so prevent the frontend from applying it
              if (!channel_id) {
                return Promise.reject(
                  new Error('Missing channel_id for tree insertion change event')
                );
              }
            }

            // Prep the change data tracked in the changes table
            const change = {
              key: payload.id,
              from_key: isCreate ? id : null,
              target,
              position,
              oldObj: isCreate ? null : node,
              source: CLIENTID,
              table: this.tableName,
              type: isCreate ? CHANGE_TYPES.COPIED : CHANGE_TYPES.MOVED,
              channel_id,
            };

            return callback({
              node,
              parent,
              payload,
              change,
            });
          }
        );
      });
    });
  },

  // Retain super's put method that does not handle tree insertion
  _put: TreeResource.prototype.put,

  /**
   * @param {Object} obj
   * @return {Promise<string>}
   */
  put(obj) {
    const prepared = this._preparePut(obj);

    return this.resolveTreeInsert(
      prepared.id,
      prepared.parent,
      RELATIVE_TREE_POSITIONS.LAST_CHILD,
      true,
      data => {
        return this.transaction({ mode: 'rw' }, () => {
          return this.table.put({ ...prepared, ...data.payload });
        });
      }
    );
  },

  move(id, target, position = RELATIVE_TREE_POSITIONS.FIRST_CHILD) {
    return this.resolveTreeInsert(id, target, position, false, data => {
      // Ignore changes from this operation except for the explicit move change we generate.
      return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, CHANGES_TABLE, async () => {
        const payload = await this.tableMove(data);
        await db[CHANGES_TABLE].put(data.change);
        return payload;
      });
    });
  },

  async tableMove({ node, parent, payload }) {
    const updated = await this.table.update(node.id, payload);
    // Update didn't succeed, this node probably doesn't exist, do a put instead,
    // but need to add in other parent info.
    if (!updated) {
      payload = {
        ...payload,
        root_id: parent.root_id,
      };
      await this.table.put(payload);
    }
    // Set old parent to changed
    if (node.parent !== parent.id) {
      await this.table.update(node.parent, { changed: true });
    }
    return payload;
  },

  /**
   * @param {string} id The ID of the node to treeCopy
   * @param {string} target The ID of the target node used for positioning
   * @param {string} position The position relative to `target`
   * @param {Object|null} [excluded_descendants] a map of node_ids to exclude from the copy
   * @return {Promise}
   */
  copy(id, target, position = RELATIVE_TREE_POSITIONS.LAST_CHILD, excluded_descendants = null) {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      /* eslint-disable no-console */
      console.groupCollapsed(`Copying contentnode from ${id} with target ${target}`);
      console.trace();
      console.groupEnd();
      /* eslint-enable */
    }

    return this.resolveTreeInsert(id, target, position, true, data => {
      data.change.excluded_descendants = excluded_descendants;

      // Ignore changes from this operation except for the
      // explicit copy change we generate.
      return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, CHANGES_TABLE, async () => {
        const payload = await this.tableCopy(data);
        await db[CHANGES_TABLE].put(data.change);
        return payload;
      });
    });
  },

  async tableCopy({ node, parent, payload }) {
    payload = {
      ...node,
      ...payload,
      published: false,
      // Placeholder node_id, we should receive the new value from backend result
      node_id: uuid4(),
      original_source_node_id: node.original_source_node_id || node.node_id,
      original_channel_id: node.original_channel_id || node.channel_id,
      source_channel_id: node.channel_id,
      source_node_id: node.node_id,
      channel_id: parent.channel_id,
      root_id: parent.root_id,
      // Set this node as copying until we get confirmation from the
      // backend that it has finished copying
      [COPYING_FLAG]: true,
      // Set to null, but this should update to a task id to track the copy
      // task once it has been initiated
      [TASK_ID]: null,
    };

    // Manually put our changes into the tree changes for syncing table
    await this.table.put(payload);
    return payload;
  },

  getAncestors(id) {
    return this.table.get(id).then(node => {
      if (node) {
        if (node.parent) {
          return this.getAncestors(node.parent).then(nodes => {
            nodes.push(node);

            return nodes;
          });
        }
        return [node];
      }
      return this.fetchCollection({ ancestors_of: id });
    });
  },

  /**
   * Uses local IndexedDB index on node_id+channel_id, otherwise specifically requests the
   * collection using the same params since GET detail endpoint doesn't support that the params
   *
   * @param {String} nodeId
   * @param {String} channelId
   * @return {Promise<{}|null>}
   */
  getByNodeIdChannelId(nodeId, channelId) {
    const values = [nodeId, channelId];
    return this.table.get({ '[node_id+channel_id]': values }).then(node => {
      if (!node) {
        return this.fetchCollection({ _node_id_channel_id_: values }).then(nodes => nodes[0]);
      }
      return node;
    });
  },
  setChannelIdOnChange: setChannelIdFromTransactionSource,

  /**
   * Waits for copying of content nodes to complete for all ids referenced in `ids` array
   * @param {string[]} ids
   * @returns {Promise<void>}
   */
  waitForCopying(ids) {
    const observable = Dexie.liveQuery(() => {
      return this.table
        .where('id')
        .anyOf(ids)
        .filter(node => !node[COPYING_FLAG])
        .toArray();
    });

    return new Promise((resolve, reject) => {
      const subscription = observable.subscribe({
        next(result) {
          if (result.length === ids.length) {
            subscription.unsubscribe();
            resolve();
          }
        },
        error() {
          subscription.unsubscribe();
          reject();
        },
      });
    });
  },
});

export const ChannelSet = new Resource({
  tableName: TABLE_NAMES.CHANNELSET,
  urlName: 'channelset',
});

export const Invitation = new Resource({
  tableName: TABLE_NAMES.INVITATION,
  urlName: 'invitation',
  indexFields: ['channel'],

  accept(id) {
    const changes = { accepted: true };
    return client.patch(window.Urls.invitationDetail(id), changes).then(() => {
      return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
        return this.table.update(id, changes);
      });
    });
  },
  setChannelIdOnChange(change) {
    change.channel_id = change.obj.channel;
  },
  setUserIdOnChange(change) {
    change.user_id = change.obj.invited;
  },
});

export const SavedSearch = new Resource({
  tableName: TABLE_NAMES.SAVEDSEARCH,
  urlName: 'savedsearch',
});

export const User = new Resource({
  tableName: TABLE_NAMES.USER,
  urlName: 'user',
  uuid: false,

  updateAsAdmin(id, changes) {
    return client.patch(window.Urls.adminUsersDetail(id), changes).then(() => {
      return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
        return this.table.update(id, changes);
      });
    });
  },

  // Used when get_storage_used endpoint polling returns
  updateDiskSpaceUsed(id, disk_space_used) {
    return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
      return this.table.update(id, { disk_space_used });
    });
  },
});

export const EditorM2M = new IndexedDBResource({
  tableName: TABLE_NAMES.EDITOR_M2M,
  indexFields: ['channel'],
  idField: '[user+channel]',
  uuid: false,
  syncable: true,
  setChannelIdOnChange(change) {
    change.channel_id = change.obj.channel;
  },
  setUserIdOnChange(change) {
    change.user_id = change.obj.user;
  },
});

export const ViewerM2M = new IndexedDBResource({
  tableName: TABLE_NAMES.VIEWER_M2M,
  indexFields: ['channel'],
  idField: '[user+channel]',
  uuid: false,
  syncable: true,
  setChannelIdOnChange(change) {
    change.channel_id = change.obj.channel;
  },
  setUserIdOnChange(change) {
    change.user_id = change.obj.user;
  },
});

export const ChannelUser = new APIResource({
  urlName: 'channeluser',
  makeEditor(channel, user) {
    return ViewerM2M.delete([user, channel]).then(() => {
      return EditorM2M.put({ user, channel });
    });
  },
  removeViewer(channel, user) {
    return ViewerM2M.delete([user, channel]);
  },
  fetchCollection(params) {
    return client.get(this.collectionUrl(), { params }).then(response => {
      const now = Date.now();
      const itemData = response.data;
      const userData = [];
      const editorM2M = [];
      const viewerM2M = [];
      for (let datum of itemData) {
        const userDatum = {
          ...datum,
        };
        userDatum[LAST_FETCHED] = now;
        delete userDatum.can_edit;
        delete userDatum.can_view;
        userData.push(userDatum);
        const m2mDatum = {
          [LAST_FETCHED]: now,
          user: datum.id,
          channel: params.channel,
        };
        if (datum.can_edit) {
          editorM2M.push(m2mDatum);
        } else if (datum.can_view) {
          viewerM2M.push(m2mDatum);
        }
      }

      return db.transaction('rw', User.tableName, EditorM2M.tableName, ViewerM2M.tableName, () => {
        // Explicitly set the source of this as a fetch
        // from the server, to prevent us from trying
        // to sync these changes back to the server!
        Dexie.currentTransaction.source = IGNORED_SOURCE;
        return Promise.all([
          EditorM2M.table.bulkPut(editorM2M),
          ViewerM2M.table.bulkPut(viewerM2M),
          User.table.bulkPut(userData),
        ]).then(() => {
          return itemData;
        });
      });
    });
  },
  where({ channel }) {
    if (!channel) {
      throw TypeError('Not a valid channelId');
    }
    const params = {
      channel,
    };
    const editorCollection = EditorM2M.table.where(params);
    const viewerCollection = ViewerM2M.table.where(params);
    return Promise.all([editorCollection.toArray(), viewerCollection.toArray()]).then(
      ([editors, viewers]) => {
        if (!editors.length && !viewers.length) {
          return this.fetchCollection(params);
        }
        if (objectsAreStale(editors) || objectsAreStale(viewers)) {
          // Do a synchronous refresh instead of background refresh here.
          return this.fetchCollection(params);
        }
        const editorSet = new Set(editors.map(editor => editor.user));
        const viewerSet = new Set(viewers.map(viewer => viewer.user));
        // Directly query indexeddb here, to avoid triggering
        // an additional request if the user data is stale but the M2M table data is not.
        return User.table
          .where('id')
          .anyOf(...editorSet.values(), ...viewerSet.values())
          .toArray(users => {
            return users.map(user => {
              const can_edit = editorSet.has(user.id);
              const can_view = viewerSet.has(user.id);
              return {
                ...user,
                can_edit,
                can_view,
              };
            });
          });
      }
    );
  },
});

export const AssessmentItem = new Resource({
  tableName: TABLE_NAMES.ASSESSMENTITEM,
  urlName: 'assessmentitem',
  idField: '[contentnode+assessment_id]',
  indexFields: ['contentnode'],
  uuid: false,
  /**
   * @param {Object} original
   * @return {Object}
   * @private
   */
  _prepareCopy(original) {
    const id = { assessment_id: uuid4() };

    return this._cleanNew({
      ...original,
      ...id,
    });
  },
  modifyAssessmentItemCount(nodeId, increment) {
    // Update assessment item count
    return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, TABLE_NAMES.CONTENTNODE, () => {
      return ContentNode.table.get(nodeId).then(node => {
        if (node) {
          return ContentNode.table.update(node.id, {
            assessment_item_count: Math.max((node.assessment_item_count || 0) + increment, 0),
          });
        }
        return null;
      });
    });
  },
  delete(id) {
    const nodeId = id[0];
    return this.transaction({ mode: 'rw' }, () => {
      return this.table.delete(id);
    }).then(data => {
      return this.modifyAssessmentItemCount(nodeId, -1).then(() => {
        return data;
      });
    });
  },
  put(obj) {
    return this.transaction({ mode: 'rw' }, () => {
      return this.table.put(this._preparePut(obj));
    }).then(id => {
      return this.modifyAssessmentItemCount(obj.contentnode, 1).then(() => {
        return id;
      });
    });
  },
  setChannelIdOnChange: setChannelIdFromTransactionSource,
});

export const File = new Resource({
  tableName: TABLE_NAMES.FILE,
  urlName: 'file',
  indexFields: ['contentnode'],
  uploadUrl({ checksum, size, type, name, file_format, preset, duration = null }) {
    return client
      .post(this.getUrlFunction('upload_url')(), {
        checksum,
        size,
        type,
        name,
        file_format,
        preset,
        duration,
      })
      .then(response => {
        if (!response) {
          return Promise.reject(fileErrors.UPLOAD_FAILED);
        }
        return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
          return this.table.put(response.data.file).then(() => {
            return response.data;
          });
        });
      });
  },
  setChannelIdOnChange: setChannelIdFromTransactionSource,
});

export const Clipboard = new TreeResource({
  tableName: TABLE_NAMES.CLIPBOARD,
  urlName: 'clipboard',
  indexFields: ['parent'],
  deleteLegacyNodes(ids) {
    // Use this to delete nodes from the frontend while
    // they are being moved in the backend
    // don't want to propagate this deletion
    // to the backend because that would affect the moved
    // nodes.
    return db.transaction('rw', this.tableName, () => {
      Dexie.currentTransaction.source = IGNORED_SOURCE;
      return this.table.bulkDelete(ids);
    });
  },

  copy(node_id, channel_id, clipboardRootId, extra_fields = null) {
    return Promise.all([
      ContentNode.getByNodeIdChannelId(node_id, channel_id),
      this.where({ parent: clipboardRootId }),
    ]).then(([node, siblings]) => {
      if (!node) {
        return Promise.reject(new RangeError(`Cannot load source node`));
      }

      const lft = this.getNewSortOrder(
        null,
        clipboardRootId,
        RELATIVE_TREE_POSITIONS.LAST_CHILD,
        siblings
      );

      // Next, we'll add the new node immediately
      const data = {
        id: uuid4(),
        lft,
        source_channel_id: channel_id,
        source_node_id: node_id,
        root_id: clipboardRootId,
        kind: node.kind,
        parent: clipboardRootId,
        extra_fields,
      };

      return this.transaction({ mode: 'rw' }, CHANGES_TABLE, () => {
        return this.table.put(data).then(() => data);
      });
    });
  },
  setUserIdOnChange(change) {
    if (vuexStore) {
      change.user_id = vuexStore.getters.currentUserId;
    }
  },
});

export const Task = new IndexedDBResource({
  tableName: TABLE_NAMES.TASK,
  idField: 'task_id',
  setTasks(tasks) {
    for (let task of tasks) {
      // Coerce channel_id to be a simple hex string
      task.channel_id = task.channel_id.replace('-', '');
    }
    return this.transaction({ mode: 'rw', source: IGNORED_SOURCE }, () => {
      return this.table
        .where(this.idField)
        .noneOf(tasks.map(t => t[this.idField]))
        .delete()
        .then(() => {
          return this.table.bulkPut(tasks);
        });
    });
  },
});
