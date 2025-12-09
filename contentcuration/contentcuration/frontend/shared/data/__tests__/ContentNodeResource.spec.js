import sortBy from 'lodash/sortBy';
import shuffle from 'lodash/shuffle';
import find from 'lodash/find';
import { Store } from 'vuex';
import {
  RELATIVE_TREE_POSITIONS,
  COPYING_STATUS,
  COPYING_STATUS_VALUES,
  TASK_ID,
  CHANGES_TABLE,
  CHANGE_TYPES,
} from 'shared/data/constants';
import db, { CLIENTID } from 'shared/data/db';
import {
  Clipboard,
  ContentNode,
  ContentNodePrerequisite,
  TreeResource,
  uuid4,
  injectVuexStore,
} from 'shared/data/resources';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

describe('TreeResource methods', () => {
  const resource = new TreeResource({
    urlName: 'test',
    tableName: 'test',
  });

  describe('treeLock method', () => {
    const wait = time => new Promise(resolve => setTimeout(resolve, time));
    it('should lock such that calls are kept in order', async () => {
      const results = [];
      const lockOne = resource.treeLock(123, () => {
        return wait(30).then(() => results.push('Lock 1'));
      });
      const lockTwo = resource.treeLock(123, () => {
        return wait(20).then(() => results.push('Lock 2'));
      });
      const lockThree = resource.treeLock(123, () => {
        return wait(10).then(() => results.push('Lock 3'));
      });

      await Promise.all([lockOne, lockTwo, lockThree]);
      expect(results).toEqual(['Lock 1', 'Lock 2', 'Lock 3']);
    });
  });

  describe('getNewSortOrder method', () => {
    const siblings = [
      {
        id: uuid4(),
        lft: 1,
      },
      {
        id: uuid4(),
        lft: 2,
      },
      {
        id: uuid4(),
        lft: 3,
      },
    ];

    it('should return 1 when no siblings', () => {
      expect(
        resource.getNewSortOrder(null, 'abc123', RELATIVE_TREE_POSITIONS.LAST_CHILD, []),
      ).toEqual(1);
    });

    it('should sort siblings', () => {
      expect(
        resource.getNewSortOrder(
          siblings[0].id,
          'abc123',
          RELATIVE_TREE_POSITIONS.FIRST_CHILD,
          shuffle(siblings),
        ),
      ).toEqual(null);
    });

    it('should return null when already first child', () => {
      expect(
        resource.getNewSortOrder(
          siblings[0].id,
          'abc123',
          RELATIVE_TREE_POSITIONS.FIRST_CHILD,
          siblings,
        ),
      ).toEqual(null);
    });

    it('should return null when already last child', () => {
      expect(
        resource.getNewSortOrder(
          siblings[2].id,
          'abc123',
          RELATIVE_TREE_POSITIONS.LAST_CHILD,
          siblings,
        ),
      ).toEqual(null);
    });

    it('should return null when already left of target', () => {
      expect(
        resource.getNewSortOrder(
          siblings[0].id,
          siblings[1].id,
          RELATIVE_TREE_POSITIONS.LEFT,
          siblings,
        ),
      ).toEqual(null);
      expect(
        resource.getNewSortOrder(
          siblings[1].id,
          siblings[2].id,
          RELATIVE_TREE_POSITIONS.LEFT,
          siblings,
        ),
      ).toEqual(null);
    });

    it('should return null when already right of target', () => {
      expect(
        resource.getNewSortOrder(
          siblings[2].id,
          siblings[1].id,
          RELATIVE_TREE_POSITIONS.RIGHT,
          siblings,
        ),
      ).toEqual(null);
      expect(
        resource.getNewSortOrder(
          siblings[1].id,
          siblings[0].id,
          RELATIVE_TREE_POSITIONS.RIGHT,
          siblings,
        ),
      ).toEqual(null);
    });

    it('should return smallest sort order', () => {
      expect(
        resource.getNewSortOrder(uuid4(), 'abc123', RELATIVE_TREE_POSITIONS.FIRST_CHILD, siblings),
      ).toEqual(1 / 2);
    });

    it('should return largest sort order', () => {
      expect(
        resource.getNewSortOrder(uuid4(), 'abc123', RELATIVE_TREE_POSITIONS.LAST_CHILD, siblings),
      ).toEqual(4);
    });

    it('should return sort order in between target and left sibling', () => {
      expect(
        resource.getNewSortOrder(uuid4(), siblings[1].id, RELATIVE_TREE_POSITIONS.LEFT, siblings),
      ).toEqual(3 / 2);
      expect(
        resource.getNewSortOrder(uuid4(), siblings[2].id, RELATIVE_TREE_POSITIONS.LEFT, siblings),
      ).toEqual(5 / 2);

      const unsorted = [siblings[1], siblings[2], siblings[0]];
      expect(
        resource.getNewSortOrder(uuid4(), siblings[0].id, RELATIVE_TREE_POSITIONS.LEFT, unsorted),
      ).toEqual(1 / 2);
    });

    it('should return sort order in between target and right sibling', () => {
      expect(
        resource.getNewSortOrder(uuid4(), siblings[1].id, RELATIVE_TREE_POSITIONS.RIGHT, siblings),
      ).toEqual(5 / 2);
      expect(
        resource.getNewSortOrder(uuid4(), siblings[0].id, RELATIVE_TREE_POSITIONS.RIGHT, siblings),
      ).toEqual(3 / 2);
    });
  });
});

describe('ContentNode methods', () => {
  const mocks = [];
  afterEach(() => {
    while (mocks.length) {
      mocks.pop().mockRestore();
    }
    return ContentNode.table.clear();
  });

  function mockMethod(name, implementation) {
    const path = name.split('.');
    const prop = path.pop();
    const mockObj = path.reduce((mockObj, prop) => mockObj[prop], ContentNode);
    const mock = jest.spyOn(mockObj, prop).mockImplementation(implementation);
    mocks.push(mock);
    return mock;
  }

  function mockProperty(name, returnValue) {
    const mock = jest.spyOn(ContentNode, name, 'get').mockImplementation(() => returnValue);
    mocks.push(mock);
    return mock;
  }

  describe('resolveParent method', () => {
    let node,
      parent,
      get,
      nodes = [];
    beforeEach(() => {
      parent = { id: uuid4(), title: 'Test node parent' };
      node = { id: uuid4(), parent: parent.id, title: 'Test node' };
      nodes = [node, parent];
      get = mockMethod('get', id => {
        return Promise.resolve(find(nodes, ['id', id]));
      });
    });

    it('should reject invalid positions', () => {
      return expect(ContentNode.resolveParent('abc123', 'not-a-valid-position')).rejects.toThrow(
        `"not-a-valid-position" is an invalid position`,
      );
    });

    it('should return target node when first child', async () => {
      await expect(
        ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.FIRST_CHILD),
      ).resolves.toBe(node);
      expect(get).toHaveBeenCalledWith(node.id, false);
    });

    it('should return target node when last child', async () => {
      await expect(
        ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.LAST_CHILD),
      ).resolves.toBe(node);
      expect(get).toHaveBeenCalledWith(node.id, false);
    });

    it("should return target node's parent when inserting after", async () => {
      await expect(ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.RIGHT)).resolves.toBe(
        parent,
      );
      expect(get).toHaveBeenNthCalledWith(1, node.id, false);
      expect(get).toHaveBeenNthCalledWith(2, parent.id, false);
    });

    it("should return target node's parent when inserting before", async () => {
      await expect(ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.LEFT)).resolves.toBe(
        parent,
      );
      expect(get).toHaveBeenNthCalledWith(1, node.id, false);
      expect(get).toHaveBeenNthCalledWith(2, parent.id, false);
    });

    it("should reject when the target can't be found", async () => {
      nodes = [];
      await expect(
        ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.FIRST_CHILD),
      ).rejects.toThrow(`Target ${node.id} does not exist`);
      expect(get).toHaveBeenNthCalledWith(1, node.id, false);
    });

    it("should reject when the target's parent can't be found", async () => {
      nodes = [node];
      await expect(
        ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.LEFT),
      ).rejects.toThrow(`Target ${parent.id} does not exist`);
      expect(get).toHaveBeenNthCalledWith(1, node.id, false);
      expect(get).toHaveBeenNthCalledWith(2, parent.id, false);
    });
  });

  describe('resolveTreeInsert method', () => {
    let node,
      parent,
      lft,
      siblings = [],
      resolveParent,
      treeLock,
      get,
      tableGet,
      where,
      getNewSortOrder;
    beforeEach(() => {
      node = { id: uuid4(), title: 'Test node', channel_id: uuid4() };
      parent = {
        id: uuid4(),
        title: 'Test node parent',
        root_id: uuid4(),
        channel_id: uuid4(),
      };
      siblings = [];
      resolveParent = mockMethod('resolveParent', () => Promise.resolve(parent));
      treeLock = mockMethod('treeLock', (id, cb) => cb());
      getNewSortOrder = mockMethod('getNewSortOrder', () => lft);
      get = mockMethod('get', () => Promise.resolve(node));
      tableGet = mockMethod('table.get', () => Promise.resolve());
      where = mockMethod('where', () => Promise.resolve(siblings));
    });

    it('should reject with error when attempting to set as child of itself', async () => {
      parent.id = 'abc123';
      await expect(
        ContentNode.resolveTreeInsert(
          { id: 'abc123', target: 'target', position: 'position', isCreate: false },
          jest.fn(),
        ),
      ).rejects.toThrow('Cannot set node as child of itself');
      expect(resolveParent).toHaveBeenCalledWith('target', 'position');
    });

    describe('moving', () => {
      it('should default to appending', async () => {
        const cb = jest.fn(() => Promise.resolve('results'));
        await expect(
          ContentNode.resolveTreeInsert(
            { id: 'abc123', target: 'target', position: 'position', isCreate: false },
            cb,
          ),
        ).resolves.toEqual('results');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(get).toHaveBeenCalledWith('abc123', false);
        expect(where).toHaveBeenCalledWith({ parent: parent.id }, false);
        expect(getNewSortOrder).not.toHaveBeenCalled();
        expect(cb).toHaveBeenCalled();
        const result = cb.mock.calls[0][0];
        expect(result).toMatchObject({
          node,
          parent,
          payload: {
            id: 'abc123',
            parent: parent.id,
            lft: 1,
            changed: true,
          },
          changeData: {
            key: 'abc123',
            from_key: null,
            target: parent.id,
            position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
            oldObj: node,
            table: 'contentnode',
          },
        });
      });

      it("should default `channel_id` to the node's", async () => {
        const cb = jest.fn(() => Promise.resolve('results'));
        parent.channel_id = null;
        await expect(
          ContentNode.resolveTreeInsert(
            { id: 'abc123', target: 'target', position: 'position', isCreate: false },
            cb,
          ),
        ).resolves.toEqual('results');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(get).toHaveBeenCalledWith('abc123', false);
        expect(where).toHaveBeenCalledWith({ parent: parent.id }, false);
        expect(getNewSortOrder).not.toHaveBeenCalled();
        expect(cb).toHaveBeenCalled();
        const result = cb.mock.calls[0][0];
        expect(result).toMatchObject({
          node,
          parent,
          payload: {
            id: 'abc123',
            parent: parent.id,
            lft: 1,
            changed: true,
          },
          changeData: {
            key: 'abc123',
            from_key: null,
            target: parent.id,
            position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
            oldObj: node,
            table: 'contentnode',
          },
        });
      });

      it('should determine lft from siblings', async () => {
        const cb = jest.fn(() => Promise.resolve('results'));
        lft = 7;
        siblings = Array(6)
          .fill(1)
          .map((_, i) => ({ id: uuid4(), lft: i, title: `Sibling ${i}` }));

        await expect(
          ContentNode.resolveTreeInsert(
            { id: 'abc123', target: 'target', position: 'position', isCreate: false },
            cb,
          ),
        ).resolves.toEqual('results');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(get).toHaveBeenCalledWith('abc123', false);
        expect(where).toHaveBeenCalledWith({ parent: parent.id }, false);
        expect(getNewSortOrder).toHaveBeenCalledWith('abc123', 'target', 'position', siblings);
        expect(cb).toHaveBeenCalled();
        const result = cb.mock.calls[0][0];
        expect(result).toMatchObject({
          node,
          parent,
          payload: {
            id: 'abc123',
            parent: parent.id,
            lft,
            changed: true,
          },
          changeData: {
            key: 'abc123',
            from_key: null,
            target: 'target',
            position: 'position',
            oldObj: node,
            table: 'contentnode',
          },
        });
      });

      it('should reject if null lft', async () => {
        lft = null;
        const cb = jest.fn(() => Promise.resolve('results'));
        siblings = Array(5)
          .fill(1)
          .map((_, i) => ({ id: uuid4(), title: `Sibling ${i}` }));
        await expect(
          ContentNode.resolveTreeInsert(
            { id: 'abc123', target: 'target', position: 'position', isCreate: false },
            cb,
          ),
        ).rejects.toThrow('New lft value evaluated to null');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(get).toHaveBeenCalledWith('abc123', false);
        expect(where).toHaveBeenCalledWith({ parent: parent.id }, false);
        expect(getNewSortOrder).toHaveBeenCalledWith('abc123', 'target', 'position', siblings);
        expect(cb).not.toHaveBeenCalled();
      });
    });

    describe('copying', () => {
      it('should default to appending', async () => {
        const cb = jest.fn(() => Promise.resolve('results'));
        await expect(
          ContentNode.resolveTreeInsert(
            { id: 'abc123', target: 'target', position: 'position', isCreate: true },
            cb,
          ),
        ).resolves.toEqual('results');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(tableGet).toHaveBeenCalledWith('abc123');
        expect(where).toHaveBeenCalledWith({ parent: parent.id }, false);
        expect(getNewSortOrder).not.toHaveBeenCalled();
        expect(cb).toHaveBeenCalled();
        const result = cb.mock.calls[0][0];
        expect(result).toMatchObject({
          node: undefined,
          parent,
          payload: {
            id: expect.not.stringMatching('abc123'),
            parent: parent.id,
            lft: 1,
            changed: true,
          },
          changeData: {
            key: expect.not.stringMatching('abc123'),
            from_key: 'abc123',
            target: parent.id,
            position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
            oldObj: null,
            table: 'contentnode',
          },
        });
        expect(result.payload.id).toEqual(result.changeData.key);
      });

      it('should determine lft from siblings', async () => {
        const cb = jest.fn(() => Promise.resolve('results'));
        lft = 7;
        siblings = Array(5)
          .fill(1)
          .map((_, i) => ({ id: uuid4(), title: `Sibling ${i}` }));
        await expect(
          ContentNode.resolveTreeInsert(
            { id: 'abc123', target: 'target', position: 'position', isCreate: true },
            cb,
          ),
        ).resolves.toEqual('results');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(tableGet).toHaveBeenCalledWith('abc123');
        expect(where).toHaveBeenCalledWith({ parent: parent.id }, false);
        expect(getNewSortOrder).toHaveBeenCalledWith(null, 'target', 'position', siblings);
        expect(cb).toHaveBeenCalled();
        const result = cb.mock.calls[0][0];
        expect(result).toMatchObject({
          node: undefined,
          parent,
          payload: {
            id: expect.not.stringMatching('abc123'),
            parent: parent.id,
            lft,
            changed: true,
          },
          changeData: {
            key: expect.not.stringMatching('abc123'),
            from_key: 'abc123',
            target: 'target',
            position: 'position',
            oldObj: null,
            table: 'contentnode',
          },
        });
        expect(result.payload.id).toEqual(result.changeData.key);
      });

      it('should reject if null lft', async () => {
        lft = null;
        const cb = jest.fn(() => Promise.resolve('results'));
        siblings = Array(5)
          .fill(1)
          .map((_, i) => ({ id: uuid4(), title: `Sibling ${i}` }));
        await expect(
          ContentNode.resolveTreeInsert(
            { id: 'abc123', target: 'target', position: 'position', isCreate: true },
            cb,
          ),
        ).rejects.toThrow('New lft value evaluated to null');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(tableGet).toHaveBeenCalledWith('abc123');
        expect(where).toHaveBeenCalledWith({ parent: parent.id }, false);
        expect(getNewSortOrder).toHaveBeenCalledWith(null, 'target', 'position', siblings);
        expect(cb).not.toHaveBeenCalled();
      });
    });
  });

  describe('tableMove method', () => {
    let node,
      oldObj,
      parent,
      payload,
      change,
      updated = true,
      table = {};

    beforeEach(() => {
      table = {
        update: jest.fn(() => Promise.resolve(updated)),
        put: jest.fn(() => Promise.resolve()),
      };
      updated = true;
      oldObj = { id: uuid4(), title: 'Parent' };
      parent = { id: uuid4(), root_id: uuid4(), title: 'Parent' };
      node = { id: uuid4(), parent: oldObj.id, title: 'Source node' };
      payload = { id: uuid4(), parent: parent.id, changed: true, lft: 1, title: 'Payload' };
      change = {
        key: payload.id,
        from_key: null,
        target: parent.id,
        position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
        oldObj: node,
        source: CLIENTID,
        table: 'contentnode',
        type: CHANGE_TYPES.MOVED,
      };

      mockProperty('table', table);
    });

    it('should update the node with the payload', async () => {
      node.parent = parent.id;
      const result = await ContentNode.tableMove({ node, parent, payload, change });
      expect(result).toMatchObject({ ...payload, modified: expect.any(String) });
      expect(table.update).toHaveBeenCalledTimes(1);
      const [updateId, updatePayload] = table.update.mock.calls[0];
      expect(updateId).toBe(node.id);
      expect(updatePayload).toBe(result);
      expect(table.put).not.toBeCalled();
      expect(table.update).not.toHaveBeenCalledWith(node.parent, { changed: true });
    });

    it('should put the node if not updated', async () => {
      node.parent = parent.id;
      updated = false;
      const newPayload = { ...payload, root_id: parent.root_id };
      const result = await ContentNode.tableMove({ node, parent, payload, change });
      expect(result).toMatchObject({ ...newPayload, modified: expect.any(String) });
      expect(table.update).toHaveBeenCalledWith(
        node.id,
        expect.objectContaining({ ...payload, modified: expect.any(String) }),
      );
      expect(table.put).toHaveBeenCalledWith(result);
      expect(table.update).not.toHaveBeenCalledWith(node.parent, { changed: true });
    });

    it('should mark the old parent as changed', async () => {
      const result = await ContentNode.tableMove({ node, parent, payload, change });
      expect(result).toMatchObject({ ...payload, modified: expect.any(String) });
      expect(table.update).toHaveBeenCalledWith(
        node.id,
        expect.objectContaining({ ...payload, modified: expect.any(String) }),
      );
      expect(table.put).not.toHaveBeenCalled();
      expect(table.update).toHaveBeenCalledWith(node.parent, { changed: true });
    });

    // TODO: the second assertion is failing saying it resolved with undefined
    it.skip('should add a change record', async () => {
      await expect(ContentNode.tableMove({ node, parent, payload, change })).resolves.toBe(payload);
      await expect(
        db[CHANGES_TABLE].get({ '[table+key]': [ContentNode.tableName, node.id] }),
      ).resolves.toMatchObject(change);
    });
  });

  describe('tableCopy method', () => {
    let node,
      parent,
      payload,
      // change,
      table = {};

    beforeEach(() => {
      table = {
        put: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
      };
      parent = {
        id: uuid4(),
        title: 'Parent',
        root_id: uuid4(),
        channel_id: uuid4(),
        node_id: uuid4(),
      };
      node = {
        id: uuid4(),
        title: 'Source node',
        root_id: uuid4(),
        channel_id: uuid4(),
        parent: uuid4(),
        source_node_id: uuid4(),
        original_source_node_id: uuid4(),
        node_id: uuid4(),
      };
      payload = { id: uuid4(), parent: parent.id, changed: true, lft: 1 };
      // change = {
      //   key: payload.id,
      //   from_key: node.id,
      //   target: parent.id,
      //   position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
      //   oldObj: null,
      //   table: 'contentnode',
      // };

      mockProperty('table', table);
    });

    it('should put the node copy appropriate payload', async () => {
      const expectedPayload = {
        id: payload.id,
        title: node.title,
        changed: true,
        published: false,
        parent: parent.id,
        lft: 1,
        node_id: expect.not.stringMatching(new RegExp(`${node.node_id}|${parent.node_id}`)),
        original_channel_id: node.original_channel_id || node.channel_id,
        original_source_node_id: node.original_source_node_id,
        source_channel_id: node.channel_id,
        source_node_id: node.node_id,
        channel_id: parent.channel_id,
        root_id: parent.root_id,
        [COPYING_STATUS]: COPYING_STATUS_VALUES.COPYING,
        [TASK_ID]: null,
      };
      await expect(ContentNode.tableCopy({ node, parent, payload })).resolves.toMatchObject(
        expectedPayload,
      );
      expect(table.put).toHaveBeenCalledWith(expectedPayload);
      // TODO: Fails
      // I think because the change is only saved in the `copy` method not the tableCopy method?
      // await expect(db[CHANGES_TABLE].get({ '[table+key]': [ContentNode.tableName, node.id] }))
      //   .resolves.toMatchObject(change);
    });
  });

  describe('getByNodeIdChannelId method', () => {
    let node,
      collection,
      fetchCollection,
      table = {};

    beforeEach(() => {
      table = {
        get: jest.fn(() => Promise.resolve(node)),
      };
      node = {
        id: uuid4(),
        title: 'Special node',
        channel_id: uuid4(),
        node_id: uuid4(),
      };

      collection = [Object.assign({}, node)];
      fetchCollection = mockMethod('fetchCollection', () => Promise.resolve(collection));
      mockProperty('table', table);
    });

    it('should use the [node_id+channel_id] IndexedDB index', async () => {
      const { node_id, channel_id } = node;
      await expect(ContentNode.getByNodeIdChannelId(node_id, channel_id)).resolves.toMatchObject(
        node,
      );
      expect(table.get).toHaveBeenCalledWith({ '[node_id+channel_id]': [node_id, channel_id] });
      expect(fetchCollection).not.toHaveBeenCalled();
    });

    it('should use call fetchCollection when missing locally', async () => {
      const { node_id, channel_id } = node;
      node = null;
      await expect(ContentNode.getByNodeIdChannelId(node_id, channel_id)).resolves.toMatchObject(
        collection[0],
      );
      expect(table.get).toHaveBeenCalledWith({ '[node_id+channel_id]': [node_id, channel_id] });
      expect(fetchCollection).toHaveBeenCalledWith({
        '[node_id+channel_id]__in': [[node_id, channel_id]],
      });
    });

    it('should be capable of returning no result', async () => {
      const { node_id, channel_id } = node;
      node = null;
      collection = [];
      await expect(ContentNode.getByNodeIdChannelId(node_id, channel_id)).resolves.toBeFalsy();
      expect(table.get).toHaveBeenCalledWith({ '[node_id+channel_id]': [node_id, channel_id] });
      expect(fetchCollection).toHaveBeenCalledWith({
        '[node_id+channel_id]__in': [[node_id, channel_id]],
      });
    });
  });
});

describe('Clipboard methods', () => {
  const mocks = [];

  function mockMethod(name, implementation) {
    const mock = jest.spyOn(Clipboard, name).mockImplementation(implementation);
    mocks.push(mock);
    return mock;
  }

  afterEach(() => {
    while (mocks.length) {
      mocks.pop().mockRestore();
    }
    return ContentNode.table.clear().then(() => Clipboard.table.clear());
  });

  describe('copy method', () => {
    let node_id, channel_id, clipboardRootId, node, siblings, where, getByNodeIdChannelId, user_id;
    beforeEach(() => {
      node_id = uuid4();
      channel_id = uuid4();
      clipboardRootId = uuid4();
      user_id = uuid4();
      node = {
        id: node_id,
        kind: ContentKindsNames.DOCUMENT,
      };
      siblings = [];
      where = mockMethod('where', () => siblings);
      getByNodeIdChannelId = jest
        .spyOn(ContentNode, 'getByNodeIdChannelId')
        .mockImplementation(() => Promise.resolve(node));
      mocks.push(getByNodeIdChannelId);
      const store = new Store({
        getters: {
          currentUserId() {
            return user_id;
          },
        },
      });
      injectVuexStore(store);
    });

    afterEach(() => {
      injectVuexStore();
    });

    it('should create a bare copy of the node', async () => {
      const extra_fields = {
        field: 'extra',
      };
      const expectedResult = {
        id: expect.not.stringMatching(new RegExp(`${node_id}|${parent.node_id}`)),
        lft: 1,
        source_channel_id: channel_id,
        source_node_id: node_id,
        root_id: clipboardRootId,
        kind: node.kind,
        parent: clipboardRootId,
        extra_fields,
      };

      const result = await Clipboard.copy(node_id, channel_id, clipboardRootId, extra_fields);
      await expect(result).toMatchObject(expectedResult);
      await expect(Clipboard.table.get(result.id)).resolves.toMatchObject(expectedResult);
      expect(getByNodeIdChannelId).toHaveBeenCalledWith(node_id, channel_id);
      expect(where).toHaveBeenCalledWith({ parent: clipboardRootId });
    });

    it('should append with lft based off siblings', async () => {
      siblings = [{ lft: 2 }, { lft: 1 }];
      const expectedResult = {
        id: expect.not.stringMatching(new RegExp(`${node_id}|${parent.node_id}`)),
        lft: 3,
        source_channel_id: channel_id,
        source_node_id: node_id,
        root_id: clipboardRootId,
        kind: node.kind,
        parent: clipboardRootId,
        extra_fields: null,
      };

      const result = await Clipboard.copy(node_id, channel_id, clipboardRootId);
      await expect(result).toMatchObject(expectedResult);
      await expect(Clipboard.table.get(result.id)).resolves.toMatchObject(expectedResult);
      expect(getByNodeIdChannelId).toHaveBeenCalledWith(node_id, channel_id);
      expect(where).toHaveBeenCalledWith({ parent: clipboardRootId });
    });

    it('should handle when source node is missing', async () => {
      node = null;
      await expect(Clipboard.copy(node_id, channel_id, clipboardRootId)).rejects.toThrow(
        'Cannot load source node',
      );
    });
  });
});

describe('ContentNodePrerequisite methods', () => {
  const mappings = [
    { target_node: 'id-integrals', prerequisite: 'id-elementary-math' },
    { target_node: 'id-elementary-math', prerequisite: 'id-reading' },
    { target_node: 'id-physics', prerequisite: 'id-integrals' },
    { target_node: 'id-astronomy', prerequisite: 'id-physics' },
    { target_node: 'id-spaceships-contruction', prerequisite: 'id-astronomy' },
    { target_node: 'id-chemistry', prerequisite: 'id-integrals' },
    { target_node: 'id-lab', prerequisite: 'id-chemistry' },
  ];
  let spy;
  beforeEach(() => {
    spy = jest
      .spyOn(ContentNode, 'fetchRequisites')
      .mockImplementation(() => Promise.resolve(mappings));
    return ContentNodePrerequisite.table.bulkPut(mappings);
  });
  afterEach(() => {
    spy.mockRestore();
    return ContentNodePrerequisite.table.clear();
  });
  describe('getRequisites method', () => {
    it('should return all associated requisites', () => {
      return ContentNode.getRequisites('id-integrals').then(entries => {
        expect(sortBy(entries, 'target_node')).toEqual(sortBy(mappings, 'target_node'));
        expect(spy).toHaveBeenCalled();
      });
    });
    it('should return all associated requisites, even when there is a cyclic dependency', () => {
      const cyclic = { target_node: 'id-chemistry', prerequisite: 'id-lab' };
      return ContentNodePrerequisite.table.add(cyclic).then(() => {
        return ContentNode.getRequisites('id-integrals').then(entries => {
          expect(sortBy(entries, 'target_node')).toEqual(
            sortBy(mappings.concat([cyclic]), 'target_node'),
          );
        });
      });
    });
    it('should return all associated requisites from the backend', () => {
      return ContentNodePrerequisite.table.clear().then(() => {
        return ContentNode.getRequisites('id-integrals').then(entries => {
          expect(sortBy(entries, 'target_node')).toEqual(sortBy(mappings, 'target_node'));
          expect(spy).toHaveBeenCalled();
        });
      });
    });
  });
});
