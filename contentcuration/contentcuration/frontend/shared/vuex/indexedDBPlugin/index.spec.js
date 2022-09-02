import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import IndexedDBPlugin, {
  commitListener,
  dispatchListener,
  Listener,
} from 'shared/vuex/indexedDBPlugin/index';
import { CLIENTID } from 'shared/data/db';
import { CHANGE_TYPES } from 'shared/data';

describe('Listener', function() {
  beforeEach(() => {
    this.callback = jest.fn();
    this.listener = new Listener(this.callback);
  });

  describe('.getEventName()', () => {
    it('should return null when unbound', () => {
      expect(this.listener.getEventName()).toEqual(null);
    });
    it("should return event name composed of table's name and change type", () => {
      this.listener.tableName = 'testTable';
      this.listener.changeType = CHANGE_TYPES.CREATED;
      expect(this.listener.getEventName()).toEqual('testTable/1');
    });
  });

  describe('.prefix(name)', () => {
    it('should return the name without a namespacePrefix', () => {
      expect(this.listener.prefix('someVuexName')).toEqual('someVuexName');
    });
    it('should prefix with namespacePrefix', () => {
      this.listener.namespacePrefix = 'test';
      expect(this.listener.prefix('someVuexName')).toEqual('test/someVuexName');
    });
  });

  const bindTest = (namespacePrefix = null) => {
    it('should return a new Listener', () => {
      const l = this.listener.bind('testTable', CHANGE_TYPES.CREATED, namespacePrefix);
      expect(l).not.toEqual(this.listener);
      expect(l).toBeInstanceOf(Listener);
    });

    it('should validate the changeType', () => {
      expect(() => {
        this.listener.bind('testTable', -1, namespacePrefix);
      }).toThrow(/^Change must be/);
    });

    it('should assign bind args on new instance', () => {
      const l = this.listener.bind('testTable', CHANGE_TYPES.CREATED, namespacePrefix);

      expect(this.listener.callback).toEqual(this.callback);
      expect(this.listener.tableName).toEqual(null);
      expect(this.listener.changeType).toEqual(null);
      expect(this.listener.namespacePrefix).toEqual(null);

      expect(l.callback).toEqual(this.callback);
      expect(l.tableName).toEqual('testTable');
      expect(l.changeType).toEqual(CHANGE_TYPES.CREATED);
      expect(l.namespacePrefix).toEqual(namespacePrefix);
    });
  };

  describe('.bind(tableName, changeType)', bindTest);
  describe('.bind(tableName, changeType, namespacePrefix)', bindTest.bind({}, 'testNamespace'));
});

describe('commitListener', function() {
  beforeEach(() => {
    this.commit = jest.fn();
    this.store = {
      commit: this.commit,
    };
    this.obj = {};
    this.listener = commitListener('testMutationName');
  });

  it('should return a Listener', () => {
    expect(this.listener).toBeInstanceOf(Listener);
  });

  describe('returned Listener.callback', () => {
    it('should trigger store.commit()', () => {
      this.listener.callback(this.store, this.obj);
      expect(this.commit).toHaveBeenCalledWith('testMutationName', this.obj);
    });

    it('should trigger store.commit() with prefix', () => {
      const l = this.listener.bind('testTable', CHANGE_TYPES.CREATED, 'testPrefix');
      l.callback(this.store, this.obj);
      expect(this.commit).toHaveBeenCalledWith('testPrefix/testMutationName', this.obj);
    });
  });
});

describe('dispatchListener', function() {
  beforeEach(() => {
    this.dispatch = jest.fn();
    this.store = {
      dispatch: this.dispatch,
    };
    this.obj = {};
    this.listener = dispatchListener('testMutationName');
  });

  it('should return a Listener', () => {
    expect(this.listener).toBeInstanceOf(Listener);
  });

  describe('returned Listener.callback', () => {
    it('should trigger store.dispatch()', () => {
      this.listener.callback(this.store, this.obj);
      expect(this.dispatch).toHaveBeenCalledWith('testMutationName', this.obj);
    });

    it('should trigger store.dispatch() with prefix', () => {
      const l = this.listener.bind('testTable', CHANGE_TYPES.CREATED, 'testPrefix');
      l.callback(this.store, this.obj);
      expect(this.dispatch).toHaveBeenCalledWith('testPrefix/testMutationName', this.obj);
    });
  });
});

describe('IndexedDBPlugin', function() {
  beforeEach(() => {
    this.source = uuidv4();
    this.db = {
      events: new EventEmitter(),
      on(...args) {
        return this.events.on(...args);
      },
    };
    this.dispatch = jest.fn();
    this.store = {};
    this.obj = {};
    this.changes = [];
    this.listeners = [];
  });

  it('should listen for events on `db`', () => {
    expect(this.db.events.listenerCount('changes')).toEqual(0);
    IndexedDBPlugin(this.db, this.listeners);
    expect(this.db.events.listenerCount('changes')).toEqual(1);
  });

  it('should return a function that registers listeners', () => {
    const listener = new Listener(jest.fn());
    const register = jest.spyOn(listener, 'register').mockImplementation(() => {});
    const result = IndexedDBPlugin(this.db, [listener]);
    expect(result).toBeInstanceOf(Function);
    result(this.store);
    expect(register).toHaveBeenCalledWith(expect.any(EventEmitter), this.store);
  });

  it('should handle change events and trigger listeners', () => {
    const testChange = (table, type, source = null, obj = null) => {
      this.db[table] = { schema: { primKey: { keyPath: 'testId' } } };
      const change = {
        key: uuidv4(),
        table,
        type,
        source: source || this.source,
        obj: obj || {
          id: uuidv4(),
        },
      };
      this.changes.push(change);
      return change;
    };

    const testListener = (table, type, namespacePrefix = null) => {
      const callback = jest.fn();
      let callObj = null;
      this.listeners.push(new Listener(callback).bind(table, type, namespacePrefix));
      return {
        addChange: (source, obj = null) => {
          const change = testChange.call(this, table, type, source, obj);
          callObj = {
            ...change.obj,
            testId: change.key,
          };
        },
        assertCalled: () => {
          expect(callback).toHaveBeenCalledWith(this.store, callObj);
        },
        assertNotCalled: () => {
          expect(callback).not.toHaveBeenCalledWith(this.store, callObj);
        },
      };
    };

    const listener1 = testListener('testTableA', CHANGE_TYPES.CREATED);
    const listener2 = testListener('testTableA', CHANGE_TYPES.UPDATED);
    const listener3 = testListener('testTableA', CHANGE_TYPES.DELETED);
    const listener4 = testListener('testTableB', CHANGE_TYPES.UPDATED, 'testVuexNamespace');
    const listener5 = testListener('testTableC', CHANGE_TYPES.CREATED, 'anotherVuexNamespace');
    const listener6 = testListener('testTableC', CHANGE_TYPES.UPDATED, 'anotherVuexNamespace');
    const listener7 = testListener('testTableZ', CHANGE_TYPES.CREATED);

    listener1.addChange();
    listener2.addChange();
    listener3.addChange();
    listener4.addChange();
    listener5.addChange();
    listener6.addChange();
    listener7.addChange(CLIENTID);

    const result = IndexedDBPlugin(this.db, this.listeners);
    result(this.store);

    listener1.assertNotCalled();
    listener2.assertNotCalled();
    listener3.assertNotCalled();
    listener4.assertNotCalled();
    listener5.assertNotCalled();
    listener6.assertNotCalled();
    listener7.assertNotCalled();

    this.db.events.emit('changes', this.changes);

    listener1.assertCalled();
    listener2.assertCalled();
    listener3.assertCalled();
    listener4.assertCalled();
    listener5.assertCalled();
    listener6.assertCalled();
    listener7.assertNotCalled(); // from source CLIENTID
  });
});
