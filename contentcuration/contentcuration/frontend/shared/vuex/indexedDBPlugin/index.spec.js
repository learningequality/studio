import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import IndexedDBPlugin, {
  commitListener,
  dispatchListener,
  Listener,
} from 'shared/vuex/indexedDBPlugin/index';
import { CHANGE_TYPES } from 'shared/data';

describe('Listener', function () {
  let callback;
  let listener;

  beforeEach(() => {
    callback = jest.fn();
    listener = new Listener(callback);
  });

  describe('.getEventName()', () => {
    it('should return null when unbound', () => {
      expect(listener.getEventName()).toEqual(null);
    });
    it("should return event name composed of table's name and change type", () => {
      listener.tableName = 'testTable';
      listener.changeType = CHANGE_TYPES.CREATED;
      expect(listener.getEventName()).toEqual('testTable/1');
    });
  });

  describe('.prefix(name)', () => {
    it('should return the name without a namespacePrefix', () => {
      expect(listener.prefix('someVuexName')).toEqual('someVuexName');
    });
    it('should prefix with namespacePrefix', () => {
      listener.namespacePrefix = 'test';
      expect(listener.prefix('someVuexName')).toEqual('test/someVuexName');
    });
  });

  const bindTest = (namespacePrefix = null) => {
    it('should return a new Listener', () => {
      const l = listener.bind('testTable', CHANGE_TYPES.CREATED, namespacePrefix);
      expect(l).not.toEqual(listener);
      expect(l).toBeInstanceOf(Listener);
    });

    it('should validate the changeType', () => {
      expect(() => {
        listener.bind('testTable', -1, namespacePrefix);
      }).toThrow(/^Change must be/);
    });

    it('should assign bind args on new instance', () => {
      const l = listener.bind('testTable', CHANGE_TYPES.CREATED, namespacePrefix);

      expect(listener.callback).toEqual(callback);
      expect(listener.tableName).toEqual(null);
      expect(listener.changeType).toEqual(null);
      expect(listener.namespacePrefix).toEqual(null);

      expect(l.callback).toEqual(callback);
      expect(l.tableName).toEqual('testTable');
      expect(l.changeType).toEqual(CHANGE_TYPES.CREATED);
      expect(l.namespacePrefix).toEqual(namespacePrefix);
    });
  };

  describe('.bind(tableName, changeType)', bindTest);
  describe('.bind(tableName, changeType, namespacePrefix)', bindTest.bind({}, 'testNamespace'));
});

describe('commitListener', function () {
  let commit;
  let store;
  let obj;
  let listener;

  beforeEach(() => {
    commit = jest.fn();
    store = {
      commit: commit,
    };
    obj = {};
    listener = commitListener('testMutationName');
  });

  it('should return a Listener', () => {
    expect(listener).toBeInstanceOf(Listener);
  });

  describe('returned Listener.callback', () => {
    it('should trigger store.commit()', () => {
      listener.callback(store, obj);
      expect(commit).toHaveBeenCalledWith('testMutationName', obj);
    });

    it('should trigger store.commit() with prefix', () => {
      const l = listener.bind('testTable', CHANGE_TYPES.CREATED, 'testPrefix');
      l.callback(store, obj);
      expect(commit).toHaveBeenCalledWith('testPrefix/testMutationName', obj);
    });
  });
});

describe('dispatchListener', function () {
  let dispatch;
  let store;
  let obj;
  let listener;

  beforeEach(() => {
    dispatch = jest.fn();
    store = {
      dispatch: dispatch,
    };
    obj = {};
    listener = dispatchListener('testMutationName');
  });

  it('should return a Listener', () => {
    expect(listener).toBeInstanceOf(Listener);
  });

  describe('returned Listener.callback', () => {
    it('should trigger store.dispatch()', () => {
      listener.callback(store, obj);
      expect(dispatch).toHaveBeenCalledWith('testMutationName', obj);
    });

    it('should trigger store.dispatch() with prefix', () => {
      const l = listener.bind('testTable', CHANGE_TYPES.CREATED, 'testPrefix');
      l.callback(store, obj);
      expect(dispatch).toHaveBeenCalledWith('testPrefix/testMutationName', obj);
    });
  });
});

describe('IndexedDBPlugin', function () {
  let source;
  let db;
  let store;
  let changes;
  let listeners;
  beforeEach(() => {
    source = uuidv4();
    db = {
      events: new EventEmitter(),
      on(...args) {
        return this.events.on(...args);
      },
    };
    store = {};
    changes = [];
    listeners = [];
  });

  it('should listen for events on `db`', () => {
    expect(db.events.listenerCount('changes')).toEqual(0);
    IndexedDBPlugin(db, listeners);
    expect(db.events.listenerCount('changes')).toEqual(1);
  });

  it('should return a function that registers listeners', () => {
    const listener = new Listener(jest.fn());
    const register = jest.spyOn(listener, 'register').mockImplementation(() => {});
    const result = IndexedDBPlugin(db, [listener]);
    expect(result).toBeInstanceOf(Function);
    result(store);
    expect(register).toHaveBeenCalledWith(expect.any(EventEmitter), store);
  });

  it('should handle change events and trigger listeners', () => {
    const testChange = (table, type, _source = null, obj = null) => {
      db[table] = { schema: { primKey: { keyPath: 'testId' } } };
      const change = {
        key: uuidv4(),
        table,
        type,
        source: _source || source,
        obj: obj || {
          test: uuidv4(),
        },
        mods: {
          test: uuidv4(),
        },
      };
      changes.push(change);
      return change;
    };

    const testListener = (table, type, namespacePrefix = null) => {
      const callback = jest.fn();
      let callObj = null;
      listeners.push(new Listener(callback).bind(table, type, namespacePrefix));
      return {
        addChange: (source, obj = null) => {
          const change = testChange.call(this, table, type, source, obj);
          callObj = {
            ...(type === CHANGE_TYPES.UPDATED ? change.mods : change.obj),
            testId: change.key,
          };
        },
        assertCalled: () => {
          expect(callback).toHaveBeenCalledWith(store, callObj);
        },
        assertNotCalled: () => {
          expect(callback).not.toHaveBeenCalledWith(store, callObj);
        },
      };
    };

    const listener1 = testListener('testTableA', CHANGE_TYPES.CREATED);
    const listener2 = testListener('testTableA', CHANGE_TYPES.UPDATED);
    const listener3 = testListener('testTableA', CHANGE_TYPES.DELETED);
    const listener4 = testListener('testTableB', CHANGE_TYPES.UPDATED, 'testVuexNamespace');
    const listener5 = testListener('testTableC', CHANGE_TYPES.CREATED, 'anotherVuexNamespace');
    const listener6 = testListener('testTableC', CHANGE_TYPES.UPDATED, 'anotherVuexNamespace');

    listener1.addChange();
    listener2.addChange();
    listener3.addChange();
    listener4.addChange();
    listener5.addChange();
    listener6.addChange();

    const result = IndexedDBPlugin(db, listeners);
    result(store);

    listener1.assertNotCalled();
    listener2.assertNotCalled();
    listener3.assertNotCalled();
    listener4.assertNotCalled();
    listener5.assertNotCalled();
    listener6.assertNotCalled();

    db.events.emit('changes', changes);

    listener1.assertCalled();
    listener2.assertCalled();
    listener3.assertCalled();
    listener4.assertCalled();
    listener5.assertCalled();
    listener6.assertCalled();
  });
});
