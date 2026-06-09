// eslint-disable-next-line import/no-named-as-default
import Dexie, { liveQuery } from 'dexie';
import Mutex from 'mutex-js';
import findIndex from 'lodash/findIndex';
import flatMap from 'lodash/flatMap';
import isArray from 'lodash/isArray';
import isString from 'lodash/isString';
import matches from 'lodash/matches';
import overEvery from 'lodash/overEvery';
import sortBy from 'lodash/sortBy';
import compact from 'lodash/compact';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';

import { v4 as uuidv4 } from 'uuid';
import {
  CHANGE_TYPES,
  CHANGES_TABLE,
  PAGINATION_TABLE,
  RELATIVE_TREE_POSITIONS,
  TABLE_NAMES,
  COPYING_STATUS,
  COPYING_STATUS_VALUES,
  TASK_ID,
  CURRENT_USER,
  MAX_REV_KEY,
  LAST_FETCHED,
  CREATION_CHANGE_TYPES,
  TREE_CHANGE_TYPES,
} from './constants';
import applyChanges, { applyMods, collectChanges } from './applyRemoteChanges';
import mergeAllChanges from './mergeChanges';
import db, { channelScope, CLIENTID, Collection } from './db';
import { API_RESOURCES, INDEXEDDB_RESOURCES, changeRevs } from './registry';
import {
  CreatedChange,
  UpdatedChange,
  DeletedChange,
  MovedChange,
  CopiedChange,
  PublishedChange,
  SyncedChange,
  DeployedChange,
  UpdatedDescendantsChange,
  PublishedNextChange,
} from './changes';
import urls from 'shared/urls';
import { currentLanguage } from 'shared/i18n';
import client, { paramsSerializer } from 'shared/client';
import { DELAYED_VALIDATION, fileErrors, NEW_OBJECT } from 'shared/constants';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { getMergedMapFields } from 'shared/utils/helpers';

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
const PAGINATION_FIELD = 'max_results';

const VALID_SUFFIXES = new Set(Object.values(QUERY_SUFFIXES));

const SUFFIX_SEPERATOR = '__';
const validPositions = new Set(Object.values(RELATIVE_TREE_POSITIONS));

const EMPTY_ARRAY = Symbol('EMPTY_ARRAY');

let vuexStore;

export function injectVuexStore(store) {
  vuexStore = store;
}

function getUserIdFromStore() {
  if (vuexStore) {
    return vuexStore.getters.currentUserId;
  }
  throw ReferenceError(
    ```
  Attempted to get the user_id from the store to set on a change object,
  but the store has not been injected into the resources.js module using injectVuexStore function
  ```,
  );
}

// Custom uuid4 function to match our dashless uuids on the server side
export function uuid4() {
  return uuidv4().replace(/-/g, '');
}

export function formatUUID4(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return uuid;
  }
  const cleanId = uuid.replace(/-/g, '');
  if (cleanId.length !== 32) {
    return uuid;
  }
  return `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(
    16,
    20,
  )}-${cleanId.slice(20)}`;
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
  for (const mixin of mixins) {
    copyProperties(Mix, mixin);
    copyProperties(Mix.prototype, mixin.prototype);
  }
  return Mix;
}

function copyProperties(target, source) {
  for (const key of Reflect.ownKeys(source)) {
    if (key !== 'constructor' && key !== 'prototype' && key !== 'name') {
      const desc = Object.getOwnPropertyDescriptor(source, key);
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
  }

  get table() {
    if (process.env.NODE_ENV !== 'production' && !db[this.tableName]) {
      /* eslint-disable no-console */
      console.error(
        `Tried to access table ${this.tableName} but it does not exist. Either requires a migration or clearing indexedDB`,
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
      source = CLIENTID;
    }
    return db.transaction(mode, this.tableName, ...extraTables, () => {
      Dexie.currentTransaction.source = source;
      return callback();
    });
  }

  /**
   * Search the "updated descendants" changes of the current resource and its
   * parents to find any changes that should be applied to the current resource.
   * And it transforms these "updated descendants" changes into "updated" changes
   * to the current resource.
   * @returns
   */
  async getInheritedChanges(itemData = []) {
    if (this.tableName !== TABLE_NAMES.CONTENTNODE || !itemData.length) {
      return Promise.resolve([]);
    }

    const updatedDescendantsChanges = await db[CHANGES_TABLE].where('type')
      .equals(CHANGE_TYPES.UPDATED_DESCENDANTS)
      .toArray();
    if (!updatedDescendantsChanges.length) {
      return Promise.resolve([]);
    }

    const inheritedChanges = [];
    const parentIds = [...new Set(itemData.map(item => item.parent).filter(Boolean))];
    const ancestorsPromises = parentIds.map(parentId => this.getAncestors(parentId));
    const parentsAncestors = await Promise.all(ancestorsPromises);

    parentsAncestors.forEach(ancestors => {
      const parent = ancestors[ancestors.length - 1];
      const ancestorsIds = ancestors.map(ancestor => ancestor.id);
      const parentChanges = updatedDescendantsChanges.filter(change =>
        ancestorsIds.includes(change.key),
      );
      if (!parentChanges.length) {
        return;
      }

      itemData
        .filter(item => item.parent === parent.id)
        .forEach(item => {
          inheritedChanges.push(
            ...parentChanges.map(change => ({
              ...change,
              mods: {
                ...change.mods,
                ...getMergedMapFields(item, change.mods),
              },
              key: item.id,
              type: CHANGE_TYPES.UPDATED,
            })),
          );
        });
    });

    return inheritedChanges;
  }

  mergeDescendantsChanges(changes, inheritedChanges, itemData) {
    if (inheritedChanges.length) {
      changes.push(...inheritedChanges);
      changes = sortBy(changes, 'rev');
    }
    changes
      .filter(change => change.type === CHANGE_TYPES.UPDATED_DESCENDANTS)
      .forEach(change => {
        change.type = CHANGE_TYPES.UPDATED;
        const item = itemData.find(i => i.id === change.key);
        if (!item) {
          return;
        }
        change.mods = {
          ...change.mods,
          ...getMergedMapFields(item, change.mods),
        };
      });

    return changes;
  }

  setData(itemData) {
    const now = Date.now();
    // Directly write to the table, rather than using the add/update methods
    // to avoid creating change events that we would sync back to the server.
    return this.transaction({ mode: 'rw' }, this.tableName, CHANGES_TABLE, () => {
      // Get any relevant changes that would be overwritten by this bulkPut
      const changesPromise = db[CHANGES_TABLE].where('[table+key]')
        .anyOf(itemData.map(datum => [this.tableName, this.getIdValue(datum)]))
        .sortBy('rev');
      const inheritedChangesPromise = this.getInheritedChanges(itemData);
      const currentPromise = this.table
        .where(this.idField)
        .anyOf(itemData.map(datum => this.getIdValue(datum)))
        .toArray();

      return Promise.all([changesPromise, inheritedChangesPromise, currentPromise]).then(
        ([changes, inheritedChanges, currents]) => {
          changes = this.mergeDescendantsChanges(changes, inheritedChanges, itemData);
          changes = mergeAllChanges(changes, true);
          const collectedChanges = collectChanges(changes)[this.tableName] || {};
          for (const changeType of Object.keys(collectedChanges)) {
            const map = {};
            for (const change of collectedChanges[changeType]) {
              map[change.key] = change;
            }
            collectedChanges[changeType] = map;
          }
          const currentMap = {};
          for (const currentObj of currents) {
            currentMap[this.getIdValue(currentObj)] = currentObj;
          }
          const data = itemData
            .map(datum => {
              const id = this.getIdValue(datum);
              datum[LAST_FETCHED] = now;
              // Persist TASK_ID and COPYING_STATUS attributes when directly
              // fetching from the server
              if (currentMap[id] && currentMap[id][TASK_ID]) {
                datum[TASK_ID] = currentMap[id][TASK_ID];
              }
              if (currentMap[id] && currentMap[id][COPYING_STATUS]) {
                datum[COPYING_STATUS] = currentMap[id][COPYING_STATUS];
              }
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
                !collectedChanges[CHANGE_TYPES.DELETED][this.getIdValue(datum)],
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
                for (const result of results) {
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
              },
            );
          });
        },
      );
    });
  }

  async where(params = {}) {
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

    // Check for pagination
    const maxResults = Number(params[PAGINATION_FIELD]);
    const paginationActive = !isNaN(maxResults);
    if (paginationActive && !params[ORDER_FIELD]) {
      params[ORDER_FIELD] = this.defaultOrdering;
    }
    for (const key of Object.keys(params)) {
      if (key === PAGINATION_FIELD) {
        // Don't filter by parameters that are used for pagination
        continue;
      }
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
      } else {
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
                ', ',
              )} alongside array parameters which is not currently supported`,
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
              ', ',
            )} which is not currently supported`,
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
      if (sortBy && this.indexFields.has(sortBy)) {
        collection = table.orderBy(sortBy);
        if (reverse) {
          collection = collection.reverse();
        }
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
            },
          ),
          // If there are filter Params, this will be defined
          filterFn,
          // If there were not, it will be undefined and filtered by the final filter
          // In addition, in the unlikely case that the suffix was not recognized,
          // this will filter out those cases too.
        ].filter(f => f),
      );
    }
    if (filterFn) {
      collection = collection.filter(filterFn);
    }
    if (paginationActive) {
      // Default pagination field is 'lft'
      let paginationField = 'lft';
      if (params.ordering) {
        paginationField = params.ordering.replace(/^-/, '');
      }
      // Determine the operator based on the ordering direction.
      const operator = params.ordering && params.ordering.startsWith('-') ? 'lt' : 'gt';

      let results;
      if (sortBy) {
        // If we still have a sortBy value here, then we have not sorted using orderBy
        // so we need to sort here.
        if (reverse) {
          collection = collection.reverse();
        }
        results = (await collection.sortBy(sortBy)).slice(0, maxResults + 1);
      } else {
        results = await collection.limit(maxResults + 1).toArray();
      }
      const hasMore = results.length > maxResults;
      return {
        results: results.slice(0, maxResults),
        more: hasMore
          ? {
              ...params,
              // Dynamically set the pagination cursor based on the pagination field and operator.
              [`${paginationField}__${operator}`]: results[maxResults - 1][paginationField],
            }
          : null,
      };
    }
    if (sortBy) {
      if (reverse) {
        collection = collection.reverse();
      }
      collection = collection.sortBy(sortBy);
    }
    return collection.toArray();
  }

  whereLiveQuery(params = {}) {
    return liveQuery(() => this.where(params));
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

  _saveAndQueueChange(change) {
    return change.saveChange().then(rev => {
      if (rev !== null) {
        changeRevs.push(rev);
      }
    });
  }

  async _updateChange(id, changes, oldObj = null) {
    if (!this.syncable) {
      return Promise.resolve();
    }
    if (!oldObj) {
      oldObj = await this.table.get(id);
    }
    if (!oldObj) {
      return Promise.resolve();
    }
    const change = new UpdatedChange({
      key: id,
      table: this.tableName,
      oldObj,
      changes,
      source: CLIENTID,
    });
    return this._saveAndQueueChange(change);
  }

  update(id, changes) {
    return this.transaction({ mode: 'rw' }, CHANGES_TABLE, () => {
      changes = this._cleanNew(changes);
      // Do the update change first so that we can diff against the
      // non-updated object.
      return this._updateChange(id, changes).then(() => {
        return this.table.update(id, changes);
      });
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
      ...this._prepareAdd(obj),
      [NEW_OBJECT]: true,
    };
  }

  _prepareAdd(obj) {
    const idMap = this._prepareCopy({});
    return this._cleanNew({
      ...idMap,
      ...obj,
    });
  }

  _createChange(id, obj) {
    if (!this.syncable) {
      return Promise.resolve();
    }
    const change = new CreatedChange({
      key: id,
      table: this.tableName,
      obj,
      source: CLIENTID,
    });
    return this._saveAndQueueChange(change);
  }

  /**
   * @param {Object} obj
   * @return {Promise<string>}
   */
  add(obj) {
    return this.transaction({ mode: 'rw' }, CHANGES_TABLE, () => {
      obj = this._prepareAdd(obj);
      return this.table.add(obj).then(id => {
        return this._createChange(id, obj).then(() => id);
      });
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

  _deleteChange(id) {
    if (!this.syncable) {
      return Promise.resolve();
    }
    return this.table.get(id).then(oldObj => {
      if (!oldObj) {
        return Promise.resolve();
      }
      const change = new DeletedChange({
        key: id,
        table: this.tableName,
        oldObj,
        source: CLIENTID,
      });
      return this._saveAndQueueChange(change);
    });
  }

  delete(id) {
    return this.transaction({ mode: 'rw' }, CHANGES_TABLE, () => {
      // Generate delete change first so that we can look up the existing object
      return this._deleteChange(id).then(() => {
        return this.table.delete(id);
      });
    });
  }

  /**
   * Return the channel_id for a change, given the object
   * @param {Object} obj
   * @returns {Object}
   */
  getChannelId() {
    return;
  }

  /**
   * Return the user_id for a change, given the object
   * @param {Object} obj
   * @returns {Object}
   */
  getUserId() {
    return;
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

  savePagination(queryString, more) {
    return this.transaction({ mode: 'rw' }, PAGINATION_TABLE, () => {
      // Always save the pagination even if null, so we know we have fetched it
      return db[PAGINATION_TABLE].put({ table: this.tableName, queryString, more });
    });
  }

  loadPagination(queryString) {
    return db[PAGINATION_TABLE].get([this.tableName, queryString]).then(pagination => {
      return pagination ? pagination.more : null;
    });
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
      let more;
      if (Array.isArray(response.data)) {
        itemData = response.data;
      } else if (response.data && response.data.results) {
        pageData = response.data;
        itemData = pageData.results;
        more = pageData.more;
      } else {
        // eslint-disable-next-line no-console
        console.error(`Unexpected response from ${this.urlName}`, response);
        itemData = [];
      }
      const paginationPromise = pageData
        ? this.savePagination(queryString, more)
        : Promise.resolve();
      return Promise.all([this.setData(itemData), paginationPromise]).then(([data]) => {
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

  conditionalFetch(objs, params, doRefresh) {
    if (objs === EMPTY_ARRAY) {
      return [];
    }
    // if there are no objects, and it's also not an empty paginated response (objs.results),
    // or we mean to refresh
    if ((!objs.length && !objs.results?.length) || doRefresh) {
      let refresh = Promise.resolve(true);
      // ContentNode tree operations are the troublemakers causing the logic below
      if (this.tableName === TABLE_NAMES.CONTENTNODE) {
        // Only fetch new updates if we don't have pending changes to ContentNode that
        // affect local tree structure
        refresh = db[CHANGES_TABLE].where('table')
          .equals(TABLE_NAMES.CONTENTNODE)
          .filter(c => {
            if (!TREE_CHANGE_TYPES.includes(c.type)) {
              return false;
            }
            let parent = c.parent;
            if (c.type === CHANGE_TYPES.CREATED) {
              parent = c.obj.parent;
            }
            return (
              params.parent === parent ||
              params.parent === c.key ||
              (params.id__in || []).includes(c.key)
            );
          })
          .count()
          .then(pendingCount => pendingCount === 0);
      }

      const fetch = refresh.then(shouldFetch => {
        const emptyResults = isArray(objs) ? [] : { results: [] };
        return shouldFetch ? this.fetchCollection(params) : emptyResults;
      });
      // Be sure to return the fetch promise to relay fetched objects in this condition
      if (!objs.length && !objs.results?.length) {
        return fetch;
      }
    }
    return objs;
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
    const paginationLoadPromise = params[PAGINATION_FIELD]
      ? this.loadPagination(paramsSerializer(params))
      : Promise.resolve(null);
    return Promise.all([super.where(params), paginationLoadPromise]).then(([objs, more]) => {
      objs = this.conditionalFetch(objs, params, doRefresh);
      if (!isArray(objs) && !objs.more && more) {
        objs.more = more;
      }
      return objs;
    });
  }

  whereLiveQuery(params = {}, doRefresh = true) {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      /* eslint-disable no-console */
      console.groupCollapsed(`Getting liveQuery for ${this.tableName} table with params: `, params);
      console.trace();
      console.groupEnd();
      /* eslint-enable */
    }
    const observable = liveQuery(() => super.where(params));
    let fetched = false;
    observable.subscribe({
      next: objs => {
        if (!fetched) {
          fetched = true;
          this.conditionalFetch(objs, params, doRefresh);
        }
      },
    });
    return observable;
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
 * Resource that allows directly creating through the API,
 * rather than through IndexedDB. API must explicitly support this.
 */
class CreateModelResource extends Resource {
  createModel(data) {
    return client.post(this.collectionUrl(), data).then(response => {
      const now = Date.now();
      const data = response.data;
      data[LAST_FETCHED] = now;
      // Directly write to the table, rather than using the add method
      // to avoid creating change events that we would sync back to the server.
      return this.transaction({ mode: 'rw' }, () => {
        return this.table.put(data).then(() => {
          return data;
        });
      });
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
  get currentChannel() {
    return window.CHANNEL_EDIT_GLOBAL || {};
  },
  get currentChannelId() {
    return this.currentChannel.channel_id || null;
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
    }
  },
  async clearChannelScope() {
    if (channelScope.id) {
      await this.updateSession({
        [`${MAX_REV_KEY}.${channelScope.id}`]: null,
      });
      channelScope.id = null;
    }
  },
  async getSession() {
    return this.get(CURRENT_USER);
  },
  async setSession(currentUser) {
    return this.transaction({ mode: 'rw' }, CHANGES_TABLE, async () => {
      const current = await this.getSession();
      if (current) {
        return this.updateSession(currentUser);
      }
      return this.table.put({ CURRENT_USER, ...currentUser });
    });
  },
  async updateSession(currentUser) {
    return this.update(CURRENT_USER, currentUser);
  },
});

export const Bookmark = new Resource({
  tableName: TABLE_NAMES.BOOKMARK,
  urlName: 'bookmark',
  idField: 'channel',
  getUserId: getUserIdFromStore,
});

export const Channel = new CreateModelResource({
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
    return this.transaction({ mode: 'rw' }, CHANGES_TABLE, () => {
      return this.table.get(id).then(channel => {
        if (Object.keys(content_defaults).length) {
          const mergedContentDefaults = {};
          Object.assign(mergedContentDefaults, channel.content_defaults || {}, content_defaults);
          changes.content_defaults = mergedContentDefaults;
        }
        // Create the update change for consistency with the super update method
        // although we could do it after as we are explicity passing in
        // the pre change channel object
        return this._updateChange(id, changes, channel).then(() => {
          return this.table.update(id, changes);
        });
      });
    });
  },

  updateAsAdmin(id, changes) {
    return client.patch(window.Urls.adminChannelsDetail(id), changes).then(() => {
      return this.transaction({ mode: 'rw' }, () => {
        return this.table.update(id, changes);
      });
    });
  },

  publish(id, version_notes) {
    return this.transaction({ mode: 'rw' }, () => {
      return this.table.update(id, { publishing: true });
    }).then(() => {
      return this.table.get(id).then(channel => {
        const change = new PublishedChange({
          key: id,
          version_notes,
          language: currentLanguage || channel.language,
          table: this.tableName,
          source: CLIENTID,
        });
        return this.transaction({ mode: 'rw' }, CHANGES_TABLE, TABLE_NAMES.CONTENTNODE, () => {
          return Promise.all([
            this._saveAndQueueChange(change),
            ContentNode.table.where({ channel_id: id }).modify({
              changed: false,
              published: true,
              has_new_descendants: false,
              has_updated_descendants: false,
            }),
          ]);
        });
      });
    });
  },

  publishDraft(id, opts = {}) {
    const { use_staging_tree = false } = opts;

    return this.transaction({ mode: 'rw' }, () => {
      return this.table.update(id, {
        publishing: true,
        publishing_draft: true,
      });
    })
      .then(() => {
        const change = new PublishedNextChange({
          key: id,
          use_staging_tree,
          table: this.tableName,
          source: CLIENTID,
        });
        return this.transaction({ mode: 'rw' }, CHANGES_TABLE, () => {
          return this._saveAndQueueChange(change);
        });
      })
      .then(() => {
        this._monitorDraftCompletion(id);
        return Promise.resolve();
      });
  },

  _monitorDraftCompletion(channelId) {
    const observable = liveQuery(() => {
      return this.table.db
        .table(CHANGES_TABLE)
        .where('table')
        .equals(TABLE_NAMES.CHANNEL)
        .and(change => change.key === channelId && change.type === CHANGE_TYPES.PUBLISHED_NEXT)
        .toArray();
    });

    const subscription = observable.subscribe({
      next: async changes => {
        if (changes.length === 0) {
          subscription.unsubscribe();
          await this.transaction({ mode: 'rw' }, () => {
            return this.table.update(channelId, {
              publishing: false,
              publishing_draft: false,
            });
          });
        }
      },
    });

    setTimeout(() => {
      subscription.unsubscribe();
    }, 300000);
  },

  deploy(id) {
    const change = new DeployedChange({
      key: id,
      source: CLIENTID,
      table: this.tableName,
    });
    return this.transaction({ mode: 'rw' }, CHANGES_TABLE, () => {
      return this._saveAndQueueChange(change);
    });
  },

  waitForDeploying(id) {
    const observable = liveQuery(() => {
      return this.table
        .where('id')
        .equals(id)
        .filter(channel => !channel['staging_root_id'] || channel['staging_root_id'] === null)
        .toArray();
    });

    return new Promise((resolve, reject) => {
      const subscription = observable.subscribe({
        next(result) {
          if (result.length === 1) {
            subscription.unsubscribe();
            resolve(result[0].root_id);
          }
        },
        error() {
          subscription.unsubscribe();
          reject();
        },
      });
    });
  },

  sync(
    id,
    {
      titles_and_descriptions = false,
      resource_details = false,
      files = false,
      assessment_items = false,
    } = {},
  ) {
    const change = new SyncedChange({
      key: id,
      titles_and_descriptions,
      resource_details,
      files,
      assessment_items,
      table: this.tableName,
      source: CLIENTID,
    });
    return this.transaction({ mode: 'rw' }, CHANGES_TABLE, () => {
      return this._saveAndQueueChange(change);
    });
  },

  softDelete(id) {
    const modelUrl = this.modelUrl(id);
    // Call endpoint directly in case we need to navigate to new page
    return this.transaction({ mode: 'rw' }, () => {
      return this.table.update(id, { deleted: true });
    }).then(() => {
      // make sure transaction is closed before calling a non-Dexie async function
      // see here: https://bit.ly/3dJtsIe
      return client.delete(modelUrl);
    });
  },
  getChannelId(obj) {
    // For channels, the appropriate channel_id for a change is just the key
    return obj.id;
  },
  async languageExistsInResources(id) {
    let langExists = await this.transaction(
      { mode: 'r' },
      TABLE_NAMES.CHANNEL,
      TABLE_NAMES.CONTENTNODE,
      () => {
        return Channel.table.get(id).then(async channel => {
          return (
            (await ContentNode.table
              .where({
                channel_id: id,
                language: channel.language,
              })
              .count()) > 0
          );
        });
      },
    );
    if (!langExists) {
      langExists = await client
        .get(this.getUrlFunction('language_exists')(id))
        .then(response => response.data.exists);
    }
    return langExists;
  },
  async languagesInResources(id) {
    const localLanguages = await this.transaction({ mode: 'r' }, TABLE_NAMES.CONTENTNODE, () => {
      return ContentNode.table
        .where({ channel_id: id })
        .filter(node => node.language !== null)
        .toArray()
        .then(nodes => nodes.map(node => node.language));
    });
    const remoteLanguages = await client
      .get(this.getUrlFunction('languages')(id))
      .then(response => response.data.languages);
    return uniq(compact(localLanguages.concat(remoteLanguages)));
  },
  async getVersionDetail(id) {
    const response = await client.get(window.Urls.channel_version_detail(id));
    return response.data;
  },
});

function getChannelFromChannelScope() {
  const channel_id = channelScope.id;
  if (channel_id) {
    return channel_id;
  }
  throw ReferenceError(
    'Attempted to get the channel_id from the channelScope object, but it has not been set.',
  );
}

export const ContentNodePrerequisite = new IndexedDBResource({
  tableName: TABLE_NAMES.CONTENTNODE_PREREQUISITE,
  indexFields: ['target_node', 'prerequisite'],
  idField: '[target_node+prerequisite]',
  uuid: false,
  syncable: true,
  getChannelId: getChannelFromChannelScope,
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
  defaultOrdering: 'lft',

  addPrerequisite(target_node, prerequisite) {
    if (target_node === prerequisite) {
      return Promise.reject('No self referential prerequisites');
    }
    // First check we have no local record of the inverse
    return ContentNodePrerequisite.get([prerequisite, target_node]).then(entry => {
      if (entry) {
        return Promise.reject('No cyclic prerequisites');
      }
      return ContentNodePrerequisite.add({
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
        id => !visited.has(id),
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
   * @param {Object} [sourceNode]
   * @param {Function<Promise<ContentNode>>} callback
   * @return {Promise<ContentNode>}
   */
  resolveTreeInsert({ id, target, position, isCreate, sourceNode = null }, callback) {
    // First, resolve parent so we can determine the sort order, but also to determine
    // the tree so we can temporarily lock it while we determine those values locally
    return this.resolveParent(target, position).then(parent => {
      if (id === parent.id) {
        throw new RangeError(`Cannot set node as child of itself`);
      }

      // Using root_id, we'll keep this locked while we handle this, so no other operations
      // happen while we're potentially waiting for some data we need (siblings, source node)
      return this.treeLock(parent.root_id, () => {
        // Resolve to sourceNode passed in if a create
        let getNode = Promise.resolve(sourceNode);
        if (!sourceNode) {
          // Don't trigger fetch, if this is specified as a creation
          getNode = isCreate ? this.table.get(id) : this.get(id, false);
        }

        // Preload the ID we're referencing, and get siblings to determine sort order
        return Promise.all([getNode, this.where({ parent: parent.id }, false)]).then(
          ([node, siblings]) => {
            let lft = 1;
            // if isCreate is true and target === id, it means it is inserting a node after the
            // same node (duplicating it), so we will need this node among the siblings to get
            // the right sort order
            if (!isCreate || target !== id) {
              siblings = siblings.filter(s => s.id !== id);
            }
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

            // Prep the change data tracked in the changes table
            const changeData = {
              key: payload.id,
              from_key: isCreate ? id : null,
              target,
              position,
              // Regardless of the specific target/position
              // always record the resolved parent for the tree insert
              // so that we can avoid doing fetches while such changes
              // are pending.
              parent: parent.id,
              oldObj: isCreate ? null : node,
              table: this.tableName,
              source: CLIENTID,
            };

            return callback({
              node,
              parent,
              payload,
              changeData,
            });
          },
        );
      });
    });
  },

  // Retain super's add method that does not handle tree insertion
  _add: TreeResource.prototype.add,

  /**
   * @param {Object} obj
   * @return {Promise<string>}
   */
  add(obj) {
    const prepared = this._prepareAdd(obj);

    return this.resolveTreeInsert(
      {
        id: prepared.id,
        target: prepared.parent,
        position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
        isCreate: true,
      },
      data => {
        return this.transaction({ mode: 'rw' }, CHANGES_TABLE, () => {
          const obj = { ...prepared, ...data.payload };
          return this.table.add(obj).then(id => {
            return this._createChange(id, obj).then(() => id);
          });
        });
      },
    );
  },

  move(id, target, position = RELATIVE_TREE_POSITIONS.FIRST_CHILD) {
    return this.resolveTreeInsert({ id, target, position, isCreate: false }, data => {
      return this.transaction({ mode: 'rw' }, CHANGES_TABLE, async () => {
        const payload = await this.tableMove(data);
        const change = new MovedChange(data.changeData);
        await this._saveAndQueueChange(change);
        return payload;
      });
    });
  },

  async tableMove({ node, parent, payload }) {
    // Do direct table writes here rather than using add/update methods to avoid
    // creating unnecessary additional change events.
    payload = {
      ...payload,
      modified: new Date().toISOString(),
    };
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
   * @param {Object|null} [sourceNode] a source node to use for the copy instead of fetching
   * @return {Promise}
   */
  copy(
    id,
    target,
    position = RELATIVE_TREE_POSITIONS.LAST_CHILD,
    excluded_descendants = null,
    sourceNode = null,
  ) {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      /* eslint-disable no-console */
      console.groupCollapsed(`Copying contentnode from ${id} with target ${target}`);
      console.trace();
      console.groupEnd();
      /* eslint-enable */
    }

    return this.resolveTreeInsert({ id, target, position, isCreate: true, sourceNode }, data => {
      data.changeData.excluded_descendants = excluded_descendants;
      data.changeData.mods = {};

      return this.transaction({ mode: 'rw' }, CHANGES_TABLE, async () => {
        const payload = await this.tableCopy(data);
        const change = new CopiedChange(data.changeData);
        await this._saveAndQueueChange(change);
        return payload;
      });
    });
  },

  /**
   * Figures out the new target and position for the failed copy node.
   * And then queues a CopyChange object for syncing to the backend.
   * @param {string} id
   * @returns {Promise}
   */
  retryCopyChange(id) {
    // Get the latest change for contentnode `id` that has an error and is of copy type.
    const change = db[CHANGES_TABLE].orderBy('rev')
      .filter(
        change =>
          change.key === id &&
          change.table === this.tableName &&
          (change.errors || change.errors === '') &&
          change.type === CHANGE_TYPES.COPIED,
      )
      .last();

    // Figure out the new target and position.
    return this.table.get(id).then(failedCopyNode => {
      const target = this.table
        .orderBy('lft')
        .filter(
          node =>
            node.id !== id &&
            node.parent === failedCopyNode.parent &&
            node.lft <= failedCopyNode.lft &&
            node[COPYING_STATUS] !== COPYING_STATUS_VALUES.FAILED &&
            node[COPYING_STATUS] !== COPYING_STATUS_VALUES.COPYING,
        )
        .last();

      return Promise.all([change, target]).then(([change, target]) => {
        if (target) {
          change.target = target.id;
          change.position = RELATIVE_TREE_POSITIONS.RIGHT;
        } else {
          change.target = failedCopyNode.parent;
          change.position = RELATIVE_TREE_POSITIONS.FIRST_CHILD;
        }

        // Fire up the change object to sync.
        this._saveAndQueueChange(new CopiedChange(change));
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
      [COPYING_STATUS]: COPYING_STATUS_VALUES.COPYING,
      // Set to null, but this should update to a task id to track the copy
      // task once it has been initiated
      [TASK_ID]: null,
    };

    // Manually put our changes into the tree changes for syncing table
    // rather than use add/update methods to avoid creating unnecessary
    // additional change events.
    await this.table.put(payload);
    return payload;
  },

  /**
   * Resolves with an array of all ancestors, including the node itself, in descending order
   *
   * @param {String} id
   * @return {Promise<[{}]>}
   */
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
      // If node wasn't found, we fetch from the server
      return this.fetchCollection({ ancestors_of: id });
    });
  },

  /**
   * Calls `updateCallback` on each ancestor, and calls `.update` for that ancestor
   * with the return value from `updateCallback`
   *
   * @param {String} id
   * @param {Boolean} includeSelf
   * @param {Boolean} ignoreChanges - Ignore generating change events for the updates
   * @param {Function} updateCallback
   * @return {Promise<void>}
   */
  async updateAncestors({ id, includeSelf = false, ignoreChanges = false }, updateCallback) {
    // getAncestors invokes a non-Dexie API, so it must be called outside the transaction.
    // Invoking it within a transaction can lead to transaction-related issues, including premature
    // commit errors, which are a common problem when mixing non-Dexie API calls with transactions.
    // See: https://dexie.org/docs/DexieErrors/Dexie.PrematureCommitError
    const ancestors = await this.getAncestors(id);

    return await this.transaction({ mode: 'rw' }, async () => {
      for (const ancestor of ancestors) {
        if (ancestor.id === id && !includeSelf) {
          continue;
        }
        if (ignoreChanges) {
          await this.table.update(ancestor.id, updateCallback(ancestor));
        } else {
          await this.update(ancestor.id, updateCallback(ancestor));
        }
      }
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
        return this.fetchCollection({ '[node_id+channel_id]__in': [values] }).then(
          nodes => nodes[0],
        );
      }
      return node;
    });
  },
  getChannelId: getChannelFromChannelScope,

  /**
   * Waits for copying of contentnode to complete for id referenced in `id`.
   * @param {string} id
   * @param {Number} startingRev -- the revision from which we start looking for
   *                                success or failure change objects.
   * @returns {Promise<void>}
   */
  waitForCopying(id, startingRev) {
    const observable = liveQuery(async () => {
      let copy_success_flag = 0;
      let change_error_flag = 0;

      copy_success_flag = await this.table
        .where('id')
        .equals(id)
        .filter(node => node[COPYING_STATUS] === COPYING_STATUS_VALUES.SUCCESS)
        .count();

      if (copy_success_flag === 1) {
        return {
          copy_success_flag,
          change_error_flag,
        };
      }

      change_error_flag = await db[CHANGES_TABLE].where('[table+key]')
        .equals([this.tableName, id])
        .filter(change => {
          if (
            (change['errors'] || change['errors'] === '') &&
            change['type'] === CHANGE_TYPES.COPIED
          ) {
            if (!startingRev || change['rev'] > startingRev) {
              return true;
            }
          }
          return false;
        })
        .count();

      return {
        copy_success_flag,
        change_error_flag,
      };
    });

    return new Promise((resolve, reject) => {
      const subscription = observable.subscribe({
        next(result) {
          if (result.copy_success_flag) {
            subscription.unsubscribe();
            resolve();
          } else if (result.change_error_flag) {
            subscription.unsubscribe();
            reject();
          }
        },
        error() {
          subscription.unsubscribe();
          reject();
        },
      });
    });
  },
  async _updateDescendantsChange(id, changes) {
    const oldObj = await this.table.get(id);
    if (!oldObj) {
      return Promise.resolve();
    }

    const change = new UpdatedDescendantsChange({
      key: id,
      table: this.tableName,
      oldObj,
      changes,
      source: CLIENTID,
    });
    return this._saveAndQueueChange(change);
  },
  /**
   * Load descendants of a content node that are already in IndexedDB.
   * It also returns the node itself.
   * @param {string} id
   * @returns {Promise<string[]>}
   *
   */
  async getLoadedDescendants(id) {
    const [node] = await this.table.where({ id }).toArray();
    if (!node) {
      return [];
    }
    const children = await this.table.where({ parent: id }).toArray();
    if (!children.length) {
      return [node];
    }
    const descendants = await Promise.all(
      children.map(child => {
        if (child.kind === ContentKindsNames.TOPIC) {
          return this.getLoadedDescendants(child.id);
        }
        return child;
      }),
    );
    return [node].concat(flatMap(descendants, d => d));
  },
  async applyChangesToLoadedDescendants(id, changes) {
    const descendants = await this.getLoadedDescendants(id);
    return Promise.all(
      descendants.map(descendant => {
        return this.table.update(descendant.id, {
          ...changes,
          ...getMergedMapFields(descendant, changes),
        });
      }),
    );
  },
  /**
   * Update a node and all its descendants that are already loaded in IndexedDB
   * @param {*} id parent node to update
   * @param {*} changes actual changes to made
   * @returns {Promise<any>}
   */
  updateDescendants(id, changes) {
    return this.transaction({ mode: 'rw' }, CHANGES_TABLE, async () => {
      changes = this._cleanNew(changes);

      await this.applyChangesToLoadedDescendants(id, changes);

      return this._updateDescendantsChange(id, changes);
    });
  },
});

export const ChannelSet = new CreateModelResource({
  tableName: TABLE_NAMES.CHANNELSET,
  urlName: 'channelset',
  getUserId: getUserIdFromStore,
});

export const Invitation = new Resource({
  tableName: TABLE_NAMES.INVITATION,
  urlName: 'invitation',
  indexFields: ['channel'],

  accept(id) {
    const changes = { accepted: true };
    return this._handleInvitation(id, window.Urls.invitationAccept(id), changes);
  },
  decline(id) {
    const changes = { declined: true };
    return this._handleInvitation(id, window.Urls.invitationDecline(id), changes);
  },
  _handleInvitation(id, url, changes) {
    return client.post(url).then(() => {
      return this.transaction({ mode: 'rw' }, () => {
        return this.table.update(id, changes);
      });
    });
  },
  getChannelId(obj) {
    return obj.channel;
  },
  getUserId(obj) {
    return obj.invited;
  },
});

export const SavedSearch = new Resource({
  tableName: TABLE_NAMES.SAVEDSEARCH,
  urlName: 'savedsearch',

  getUserId(obj) {
    return obj.saved_by;
  },
});

export const User = new Resource({
  tableName: TABLE_NAMES.USER,
  urlName: 'user',
  uuid: false,

  updateAsAdmin(id, changes) {
    return client.patch(window.Urls.adminUsersDetail(id), changes).then(() => {
      return this.transaction({ mode: 'rw' }, () => {
        return this.table.update(id, changes);
      });
    });
  },

  // Used when get_storage_used endpoint polling returns
  updateDiskSpaceUsed(id, disk_space_used) {
    return this.transaction({ mode: 'rw' }, () => {
      return this.table.update(id, { disk_space_used });
    });
  },
  getUserId(obj) {
    return obj.id;
  },
  async markNotificationsRead(timestamp) {
    await client.post(window.Urls.userMarkNotificationsRead(), {
      timestamp,
    });
    await Session.updateSession({ last_read_notification_date: timestamp });
  },
});

export const EditorM2M = new IndexedDBResource({
  tableName: TABLE_NAMES.EDITOR_M2M,
  indexFields: ['channel'],
  idField: '[user+channel]',
  uuid: false,
  syncable: true,
  getChannelId(obj) {
    return obj.channel;
  },
  getUserId(obj) {
    return obj.user;
  },
});

export const ViewerM2M = new IndexedDBResource({
  tableName: TABLE_NAMES.VIEWER_M2M,
  indexFields: ['channel'],
  idField: '[user+channel]',
  uuid: false,
  syncable: true,
  getChannelId(obj) {
    return obj.channel;
  },
  getUserId(obj) {
    return obj.user;
  },
});

export const ChannelUser = new APIResource({
  urlName: 'channeluser',
  makeEditor(channel, user) {
    return ViewerM2M.delete([user, channel]).then(() => {
      return EditorM2M.add({ user, channel });
    });
  },
  removeViewer(channel, user) {
    const modelUrl = urls.channeluser_remove_self(user);
    const params = { channel_id: channel };
    return ViewerM2M.delete([user, channel])
      .then(() => client.delete(modelUrl, { params }))
      .then(() => Channel.table.delete(channel))
      .catch(err => {
        throw err;
      });
  },
  fetchCollection(params) {
    return client.get(this.collectionUrl(), { params }).then(response => {
      const now = Date.now();
      const itemData = response.data;
      const userData = [];
      const editorM2M = [];
      const viewerM2M = [];
      for (const datum of itemData) {
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
      },
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
    return this.transaction({ mode: 'rw' }, TABLE_NAMES.CONTENTNODE, () => {
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
  // Retain super's delete method
  _delete: Resource.prototype.delete,
  delete(id) {
    const nodeId = id[0];
    return this._delete(id).then(data => {
      return this.modifyAssessmentItemCount(nodeId, -1).then(() => {
        return data;
      });
    });
  },
  // Retain super's add method
  _add: Resource.prototype.add,
  add(obj) {
    return this._add(obj).then(id => {
      return this.modifyAssessmentItemCount(obj.contentnode, 1).then(() => {
        return id;
      });
    });
  },
  getChannelId: getChannelFromChannelScope,
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
        return this.transaction({ mode: 'rw' }, () => {
          return this.table.put(response.data.file).then(() => {
            return response.data;
          });
        });
      });
  },
  getChannelId: getChannelFromChannelScope,
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
        siblings,
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
        return this.table.add(data).then(id => {
          return this._createChange(id, data).then(() => data);
        });
      });
    });
  },
  getUserId: getUserIdFromStore,
});

export const Task = new IndexedDBResource({
  tableName: TABLE_NAMES.TASK,
  idField: 'task_id',
  setTasks(tasks) {
    for (const task of tasks) {
      // Coerce channel_id to be a simple hex string
      task.channel_id = task.channel_id.replace('-', '');
    }
    return this.transaction({ mode: 'rw' }, () => {
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

export const Recommendation = new APIResource({
  urlName: 'recommendations',
  fetchCollection(params) {
    return client.post(window.Urls.recommendations(), params).then(response => {
      return response.data || [];
    });
  },
});

export const CommunityLibrarySubmission = new APIResource({
  urlName: 'community_library_submission',
  fetchCollection(params) {
    return client.get(this.collectionUrl(), { params }).then(response => {
      return response.data || [];
    });
  },
  async fetchModel(id) {
    const response = await client.get(this.modelUrl(id));
    return response.data;
  },
  create(params) {
    return client.post(this.collectionUrl(), params).then(response => {
      return response.data;
    });
  },
});

export const AdminCommunityLibrarySubmission = new APIResource({
  urlName: 'admin_community_library_submission',
  fetchCollection(params) {
    return client.get(this.collectionUrl(), { params }).then(response => {
      return response.data || [];
    });
  },
  async fetchModel(id) {
    const response = await client.get(this.modelUrl(id));
    return response.data;
  },
  async resolve(id, params) {
    const response = await client.post(this.getUrlFunction('resolve')(id), params);
    return response.data;
  },
});

export const AuditedSpecialPermissionsLicense = new APIResource({
  urlName: 'audited_special_permissions_license',
  async fetchCollection(params) {
    const response = await client.get(this.collectionUrl(), { params });
    return response.data || [];
  },
});

export const ChannelVersion = new APIResource({
  urlName: 'channelversion',
  async fetchCollection(params) {
    const response = await client.get(this.collectionUrl(), { params });
    return response.data;
  },
});
