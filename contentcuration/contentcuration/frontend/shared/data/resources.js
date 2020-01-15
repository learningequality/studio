import Dexie from 'dexie';
import matches from 'lodash/matches';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import uuidv4 from 'uuid/v4';
import channel from './broadcastChannel';
import { FETCH_SOURCE, MESSAGES, STATUS } from './constants';
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
      const data = response.data.map(datum => {
        datum[LAST_FETCHED] = now;
        return datum
      });
      return db.transaction('rw', this.tableName, () => {
        // Explicitly set the source of this as a fetch
        // from the server, to prevent us from trying
        // to sync these changes back to the server!
        Dexie.currentTransaction.source = FETCH_SOURCE;
        return this.table.bulkPut(data).then(() => {
          return data;
        });
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


export default RESOURCES;