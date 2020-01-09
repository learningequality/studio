import Dexie from 'dexie';
import 'dexie-observable';
import uuidv4 from 'uuid/v4';
import isFunction from 'lodash/isFunction';
import mapValues from 'lodash/mapValues';
import matches from 'lodash/matches';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import client from 'shared/client';


const CREATED = 1;
const UPDATED = 2;
const DELETED = 3;

function uuid4() {
  return uuidv4().replace(/-/g, '');
}

// A UUID to distinguish this JS client from others in the same browser.
const CLIENTID = uuidv4();

const RESOURCES = {};

const LISTENERS = {};

const db = new Dexie("KolibriStudio");

export function initializeDB() {

  db.version(1).stores(mapValues(RESOURCES, value => value.schema));
  db.on('changes', function (changes) {
    changes.forEach(function (change) {
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
    });
  });

  return db.open();
}

function registerListener(table, change, callback) {
  if (![CREATED, UPDATED, DELETED].includes(change)) {
    throw RangeError(`Change must be ${CREATED}, ${UPDATED}, or ${DELETED}`);
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

function removeListener(table, change, callback) {
  if (LISTENERS[table]) {
    if (LISTENERS[table][change]) {
      return LISTENERS[table][change].delete(callback);
    }
  }
  return false;
}


class Resource {
  constructor({ tableName, urlName, idField = 'id', uuid = true, indexFields = [] } = {}) {
    this.tableName = tableName;
    this.urlName = urlName;
    this.idField = idField;
    this.uuid = uuid;
    this.schema = [`${uuid ? '' : '++'}${idField}`, ...indexFields].join(',');
    this.indexFields = [idField, ...indexFields];
    RESOURCES[tableName] = this;
  }

  get table() {
    return db[this.tableName];
  }

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

  fetchCollection(params) {
    return client.get(this.collectionUrl(), { params }).then(response => {
      return this.transaction('rw', () => {
        return this.table.bulkPut(response.data).then(() => {
          return response.data;
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
      const refresh = false;
      if (!objs) {
        return this.fetchCollection(params);
      }
      if (refresh) {
        this.fetchCollection(params);
      }
      return objs;
    });
  }

  fetchModel(id) {
    return client.get(this.modelUrl(id)).then(response => {
      return this.transaction('rw', () => {
        return this.table.put(response.data).then(() => {
          return response.data;
        });
      });
    });
  }

  get(id) {
    return this.table.get(id).then(obj => {
      if (obj) {
        return obj;
      }
      return this.fetchModel(id);
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

  onCreate(callback) {
    registerListener(this.tableName, CREATED, callback);
    return () => removeListener(this.tableName, CREATED, callback);
  }

  onUpdate(callback) {
    registerListener(this.tableName, UPDATED, callback);
    return () => removeListener(this.tableName, UPDATED, callback);
  }

  onDelete(callback) {
    registerListener(this.tableName, DELETED, callback);
    return () => removeListener(this.tableName, DELETED, callback);
  }
}

export const Channel = new Resource({
  tableName: 'channel',
  urlName: 'channel',
  indexFields: ['name', 'language'],
});

export const ContentNode = new Resource({
  tableName: 'contentNode',
  urlName: 'contentnode',
  indexFields: ['title', 'language', 'parent'],
});
