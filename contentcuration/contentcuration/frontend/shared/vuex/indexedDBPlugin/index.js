import { EventEmitter } from 'events';
import { CHANGE_TYPES } from 'shared/data';
import { CLIENTID } from 'shared/data/db';

function getEventName(table, type) {
  return `${table}/${type}`;
}

export class Listener {
  /**
   * @param {Function} callback
   */
  constructor(callback) {
    this.callback = callback;
    this.tableName = null;
    this.changeType = null;
    this.namespacePrefix = null;
  }

  /**
   * @return {string|null}
   */
  getEventName() {
    if (!this.tableName || !this.changeType) {
      return null;
    }
    return getEventName(this.tableName, this.changeType);
  }

  /**
   * @param {string} name
   * @return {string}
   */
  prefix(name) {
    return this.namespacePrefix ? `${this.namespacePrefix}/${name}` : name;
  }

  /**
   * @param {String} tableName
   * @param {String|Number} changeType
   * @param {String|null} [namespacePrefix]
   * @return {Listener}
   */
  bind(tableName, changeType, namespacePrefix = null) {
    changeType = Number(changeType);
    if (!Object.values(CHANGE_TYPES).includes(changeType)) {
      throw RangeError(
        `Change must be ${CHANGE_TYPES.CREATED}, ${CHANGE_TYPES.UPDATED}, or ${CHANGE_TYPES.DELETED}`
      );
    }

    const listener = new this.constructor(this.callback);
    listener.tableName = tableName;
    listener.changeType = changeType;
    listener.namespacePrefix = namespacePrefix;
    return listener;
  }

  /**
   * @param {EventEmitter} events
   * @param {Store} store
   */
  register(events, store) {
    const eventName = this.getEventName();

    if (!eventName) {
      console.warn('Cannot register unbound listener: ' + this.callback.toString());
      return;
    }

    events.addListener(eventName, obj => {
      this.callback(store, obj);
    });
  }
}

export class ListenerGroup extends Listener {
  /**
   * @param {Listener[]} listeners
   */
  constructor(listeners) {
    super(null);
    this.listeners = listeners || [];
  }

  /**
   * @param {String} tableName
   * @param {String|Number} changeType
   * @param {String|null} [namespacePrefix]
   * @return {ListenerGroup}
   */
  bind(tableName, changeType, namespacePrefix = null) {
    const bound = super.bind(tableName, changeType, namespacePrefix);
    bound.listeners = this.listeners.map(listener =>
      listener.bind(tableName, changeType, namespacePrefix)
    );
    return bound;
  }

  /**
   * @param {EventEmitter} events
   * @param {Store} store
   */
  register(events, store) {
    this.listeners.forEach(listener => listener.register(events, store));
  }
}

/**
 * Returns an IndexedDB listener that triggers a Vuex mutation
 *
 * @param {String} mutationName
 * @return {Listener}
 */
export function commitListener(mutationName) {
  return new Listener(function(store, obj) {
    store.commit(this.prefix(mutationName), obj);
  });
}

/**
 * Returns an IndexedDB listener that triggers a Vuex action
 *
 * @param {String} actionName
 * @return {Listener}
 */
export function dispatchListener(actionName) {
  return new Listener(function(store, obj) {
    store.dispatch(this.prefix(actionName), obj);
  });
}

/**
 * @param {Dexie} db
 * @param {Listener[]} listeners
 * @return {function(*=): void}
 * @constructor
 */
export default function IndexedDBPlugin(db, listeners = []) {
  const events = new EventEmitter();
  events.setMaxListeners(1000);

  db.on('changes', function(changes) {
    changes.forEach(function(change) {
      // Don't invoke listeners if their client originated the change
      if (CLIENTID !== change.source) {
        // Always invoke the listeners with the full object representation
        // It is up to the callbacks to know how to parse this.
        const obj = Object.assign(
          { [db[change.table].schema.primKey.keyPath]: change.key },
          change.obj || {}
        );
        events.emit(getEventName(change.table, change.type), obj);
      }
    });
  });

  return function(store) {
    listeners.forEach(listener => listener.register(events, store));
  };
}
