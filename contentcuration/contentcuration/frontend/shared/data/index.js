import Dexie from 'dexie';
import 'dexie-observable';
import uuidv4 from 'uuid/v4';
import isFunction from 'lodash/isFunction';
import mapValues from 'lodash/mapValues';
import matches from 'lodash/matches';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { BroadcastChannel, createLeaderElection } from 'broadcast-channel';
import { CHANGE_TYPES, MESSAGES, STATUS } from './constants';
import client from 'shared/client';

// Re-export for ease of reference.
export { CHANGE_TYPES } from './constants';

// Custom uuid4 function to match our dashless uuids on the server side
function uuid4() {
  return uuidv4().replace(/-/g, '');
}

if (process.env.NODE_ENV !== 'production') {
  // If not in production mode, turn Dexie's debug mode on.
  Dexie.debug = true;
}

// A UUID to distinguish this JS client from others in the same browser.
const CLIENTID = uuidv4();

const RESOURCES = {};

const LISTENERS = {};

const appId = "KolibriStudio";

const db = new Dexie(appId);

const channel = new BroadcastChannel(appId);

// Number of seconds after which data is considered stale.
const REFRESH_INTERVAL = 60;

const LAST_FETCHED = '__last_fetch';

const CHANGES_TABLE = '__changesTable';

export function initializeDB() {

  db.version(1).stores({
    ...mapValues(RESOURCES, value => value.schema)
  });

  db.on('changes', function (changes) {
    changes.forEach(function (change) {
      // Don't do anything for changes from the special changes table
      // or we might get into a little bit of a recursive loop.
      if (change.table !== CHANGES_TABLE) {
        // Don't invoke listeners if their client originated the change
        if (CLIENTID !== change.source) {
          const tableListeners = LISTENERS[change.table];
          if (tableListeners) {
            const changeListeners = tableListeners[change.type];
            if (changeListeners) {
              for (let listener of changeListeners.values()) {
                // Always invoke the callback with the full object representation
                // It is up to the callbacks to know how to parse this.
                listener(change.obj);
              };
            }
          }
        }
      }
    });
  });

  const elector = createLeaderElection(channel);

  elector.awaitLeadership().then(()=> {
    channel.addEventListener('message', function(msg) {
      if (msg.type === MESSAGES.FETCH_COLLECTION && msg.tableName && msg.params) {
        RESOURCES[msg.tableName].fetchCollection(msg.params).then(data => {
          channel.postMessage({
            messageId: msg.messageId,
            type: MESSAGES.REQUEST_RESPONSE,
            status: STATUS.SUCCESS,
            data,
          })
        }).catch(err => {
          channel.postMessage({
            messageId: msg.messageId,
            type: MESSAGES.REQUEST_RESPONSE,
            status: STATUS.FAILURE,
            err,
          })
        });
      }
      if (msg.type === MESSAGES.FETCH_MODEL && msg.tableName && msg.id) {
        RESOURCES[msg.tableName].fetchModel(msg.id).then(data => {
          channel.postMessage({
            messageId: msg.messageId,
            type: MESSAGES.REQUEST_RESPONSE,
            status: STATUS.SUCCESS,
            data,
          })
        }).catch(err => {
          channel.postMessage({
            messageId: msg.messageId,
            type: MESSAGES.REQUEST_RESPONSE,
            status: STATUS.FAILURE,
            err,
          })
        });
      }
    });
  });

  return db.open();
}

export function registerListener(table, change, callback) {
  change = Number(change);
  if (!Object.values(CHANGE_TYPES).includes(change)) {
    throw RangeError(`Change must be ${CHANGE_TYPES.CREATED}, ${CHANGE_TYPES.UPDATED}, or ${CHANGE_TYPES.DELETED}`);
  }
  if (!isFunction(callback)) {
    throw TypeError("Callback argument must be a function");
  }
  if (!LISTENERS[table]) {
    LISTENERS[table] = {};
  }
  if (!LISTENERS[table][change]) {
    LISTENERS[table][change] = new Map();
  }
  LISTENERS[table][change].set(callback, callback);
}

export function removeListener(table, change, callback) {
  if (LISTENERS[table]) {
    if (LISTENERS[table][change]) {
      return LISTENERS[table][change].delete(callback);
    }
  }
  return false;
}


class Resource {
  constructor({ tableName, urlName, idField = 'id', uuid = true, indexFields = [], ...options } = {}) {
    this.tableName = tableName;
    this.urlName = urlName;
    this.idField = idField;
    this.uuid = uuid;
    this.schema = [`${uuid ? '' : '++'}${idField}`, ...indexFields].join(',');
    this.indexFields = [idField, ...indexFields];
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
      callback();
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
      const data = response.data.map(datum => {
        datum[LAST_FETCHED] = now;
        return datum
      });
      return this.table.bulkPut(data).then(() => {
        return data;
      });
    });
  }

  where(params) {
    const table = db[this.tableName];
    const whereParams = pick(params, this.indexFields);
    let collection;
    if (Object.keys(whereParams).length ==! 0) {
      collection = table.where(whereParams);
    } else {
      collection = table.toCollection();
    }
    const filterParams = omit(params, this.indexFields);
    if (Object.keys(filterParams).length ==! 0) {
      const filterFn = matches(filterParams);
      collection = collection.filter(filterFn);
    }
    return collection.toArray(objs => {
      if (!objs.length) {
        return this.requestCollection(params);
      }
      const now = Date.now();
      if (objs.some(obj => {
        const refresh = obj[LAST_FETCHED] + REFRESH_INTERVAL * 1000;
        return refresh < now
      })) {
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
      return this.table.put(data).then(() => {
        return data;
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

  put(obj) {
    if (this.uuid) {
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

  postModel(data) {
    return client.post(this.collectionUrl(), data);
  }

  patchModel(data) {
    return client.post(this.modelUrl(data[this.idField]), data);
  }

  deleteModel(id) {
    return client.delete(this.modelUrl(id));
  }
}


export const TABLE_NAMES = {
  CHANNEL: 'channel',
  CONTENTNODE: 'contentnode',
};

export const Channel = new Resource({
  tableName: TABLE_NAMES.CHANNEL,
  urlName: 'channel',
  indexFields: ['name', 'language'],
});

export const ContentNode = new Resource({
  tableName: TABLE_NAMES.CONTENTNODE,
  urlName: 'contentnode',
  indexFields: ['title', 'language', 'parent'],
});
