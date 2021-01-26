import sortBy from 'lodash/sortBy';
import find from 'lodash/find';
import {
  RELATIVE_TREE_POSITIONS,
  COPYING_FLAG,
  TASK_ID,
  CHANGES_TABLE,
  CHANGE_TYPES,
} from 'shared/data/constants';
import db, { CLIENTID } from 'shared/data/db';
import { ContentNode, ContentNodePrerequisite, uuid4 } from 'shared/data/resources';

describe('ContentNode methods', () => {
  const mocks = [];
  afterEach(() => {
    while (mocks.length) {
      mocks.pop().mockRestore();
    }
    return ContentNode.table.clear();
  });

  function mockMethod(name, implementation) {
    const mock = jest.spyOn(ContentNode, name).mockImplementation(implementation);
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
        `"not-a-valid-position" is an invalid position`
      );
    });

    it('should return target node when first child', async () => {
      await expect(
        ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.FIRST_CHILD)
      ).resolves.toBe(node);
      expect(get).toHaveBeenCalledWith(node.id);
    });

    it('should return target node when last child', async () => {
      await expect(
        ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.LAST_CHILD)
      ).resolves.toBe(node);
      expect(get).toHaveBeenCalledWith(node.id);
    });

    it("should return target node's parent when inserting after", async () => {
      await expect(ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.RIGHT)).resolves.toBe(
        parent
      );
      expect(get).toHaveBeenNthCalledWith(1, node.id);
      expect(get).toHaveBeenNthCalledWith(2, parent.id);
    });

    it("should return target node's parent when inserting before", async () => {
      await expect(ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.LEFT)).resolves.toBe(
        parent
      );
      expect(get).toHaveBeenNthCalledWith(1, node.id);
      expect(get).toHaveBeenNthCalledWith(2, parent.id);
    });

    it("should reject when the target can't be found", async () => {
      nodes = [];
      await expect(
        ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.FIRST_CHILD)
      ).rejects.toThrow(`Target ${node.id} does not exist`);
      expect(get).toHaveBeenNthCalledWith(1, node.id);
    });

    it("should reject when the target's parent can't be found", async () => {
      nodes = [node];
      await expect(
        ContentNode.resolveParent(node.id, RELATIVE_TREE_POSITIONS.LEFT)
      ).rejects.toThrow(`Target ${parent.id} does not exist`);
      expect(get).toHaveBeenNthCalledWith(1, node.id);
      expect(get).toHaveBeenNthCalledWith(2, parent.id);
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
      where,
      getNewSortOrder,
      sortBy;
    beforeEach(() => {
      node = { id: uuid4(), title: 'Test node' };
      parent = {
        id: uuid4(),
        title: 'Test node parent',
        root_id: uuid4(),
      };
      siblings = [];
      resolveParent = mockMethod('resolveParent', () => Promise.resolve(parent));
      treeLock = mockMethod('treeLock', (id, cb) => cb());
      getNewSortOrder = mockMethod('getNewSortOrder', () => lft);
      get = mockMethod('get', id => Promise.resolve(node));
      sortBy = jest.fn(() => Promise.resolve(siblings));
      where = mockMethod('where', () => ({ sortBy }));
    });

    it('should reject with error when attempting to set as child of itself', async () => {
      parent.id = 'abc123';
      await expect(
        ContentNode.resolveTreeInsert('abc123', 'target', 'position', false, jest.fn())
      ).rejects.toThrow('Cannot set node as child of itself');
      expect(resolveParent).toHaveBeenCalledWith('target', 'position');
    });

    describe('moving', () => {
      it('should default to appending', async () => {
        let cb = jest.fn(() => Promise.resolve('results'));
        await expect(
          ContentNode.resolveTreeInsert('abc123', 'target', 'position', false, cb)
        ).resolves.toEqual('results');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(get).toHaveBeenCalledWith('abc123');
        expect(where).toHaveBeenCalledWith({ parent: parent.id });
        expect(getNewSortOrder).not.toBeCalled();
        expect(cb).toBeCalled();
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
          change: {
            key: 'abc123',
            from_key: null,
            target: parent.id,
            position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
            oldObj: node,
            source: CLIENTID,
            table: 'contentnode',
            type: CHANGE_TYPES.MOVED,
          },
        });
      });

      it('should determine lft from siblings', async () => {
        let cb = jest.fn(() => Promise.resolve('results'));
        lft = 7;
        siblings = Array(5)
          .fill(1)
          .map((_, i) => ({ id: uuid4(), title: `Sibling ${i}` }));
        await expect(
          ContentNode.resolveTreeInsert('abc123', 'target', 'position', false, cb)
        ).resolves.toEqual('results');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(get).toHaveBeenCalledWith('abc123');
        expect(where).toHaveBeenCalledWith({ parent: parent.id });
        expect(getNewSortOrder).toHaveBeenCalledWith('abc123', 'target', 'position', siblings);
        expect(cb).toBeCalled();
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
          change: {
            key: 'abc123',
            from_key: null,
            target: 'target',
            position: 'position',
            oldObj: node,
            source: CLIENTID,
            table: 'contentnode',
            type: CHANGE_TYPES.MOVED,
          },
        });
      });

      it('should reject if null lft', async () => {
        lft = null;
        let cb = jest.fn(() => Promise.resolve('results'));
        siblings = Array(5)
          .fill(1)
          .map((_, i) => ({ id: uuid4(), title: `Sibling ${i}` }));
        await expect(
          ContentNode.resolveTreeInsert('abc123', 'target', 'position', false, cb)
        ).rejects.toThrow('New lft value evaluated to null');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(get).toHaveBeenCalledWith('abc123');
        expect(where).toHaveBeenCalledWith({ parent: parent.id });
        expect(getNewSortOrder).toHaveBeenCalledWith('abc123', 'target', 'position', siblings);
        expect(cb).not.toBeCalled();
      });
    });

    describe('copying', () => {
      it('should default to appending', async () => {
        let cb = jest.fn(() => Promise.resolve('results'));
        await expect(
          ContentNode.resolveTreeInsert('abc123', 'target', 'position', true, cb)
        ).resolves.toEqual('results');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(get).toHaveBeenCalledWith('abc123');
        expect(where).toHaveBeenCalledWith({ parent: parent.id });
        expect(getNewSortOrder).not.toBeCalled();
        expect(cb).toBeCalled();
        const result = cb.mock.calls[0][0];
        expect(result).toMatchObject({
          node,
          parent,
          payload: {
            id: expect.not.stringMatching('abc123'),
            parent: parent.id,
            lft: 1,
            changed: true,
          },
          change: {
            key: expect.not.stringMatching('abc123'),
            from_key: 'abc123',
            target: parent.id,
            position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
            oldObj: null,
            source: CLIENTID,
            table: 'contentnode',
            type: CHANGE_TYPES.COPIED,
          },
        });
        expect(result.payload.id).toEqual(result.change.key);
      });

      it('should determine lft from siblings', async () => {
        let cb = jest.fn(() => Promise.resolve('results'));
        lft = 7;
        siblings = Array(5)
          .fill(1)
          .map((_, i) => ({ id: uuid4(), title: `Sibling ${i}` }));
        await expect(
          ContentNode.resolveTreeInsert('abc123', 'target', 'position', true, cb)
        ).resolves.toEqual('results');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(get).toHaveBeenCalledWith('abc123');
        expect(where).toHaveBeenCalledWith({ parent: parent.id });
        expect(getNewSortOrder).toHaveBeenCalledWith(null, 'target', 'position', siblings);
        expect(cb).toBeCalled();
        const result = cb.mock.calls[0][0];
        expect(result).toMatchObject({
          node,
          parent,
          payload: {
            id: expect.not.stringMatching('abc123'),
            parent: parent.id,
            lft,
            changed: true,
          },
          change: {
            key: expect.not.stringMatching('abc123'),
            from_key: 'abc123',
            target: 'target',
            position: 'position',
            oldObj: null,
            source: CLIENTID,
            table: 'contentnode',
            type: CHANGE_TYPES.COPIED,
          },
        });
        expect(result.payload.id).toEqual(result.change.key);
      });

      it('should reject if null lft', async () => {
        lft = null;
        let cb = jest.fn(() => Promise.resolve('results'));
        siblings = Array(5)
          .fill(1)
          .map((_, i) => ({ id: uuid4(), title: `Sibling ${i}` }));
        await expect(
          ContentNode.resolveTreeInsert('abc123', 'target', 'position', true, cb)
        ).rejects.toThrow('New lft value evaluated to null');
        expect(resolveParent).toHaveBeenCalledWith('target', 'position');
        expect(treeLock).toHaveBeenCalledWith(parent.root_id, expect.any(Function));
        expect(get).toHaveBeenCalledWith('abc123');
        expect(where).toHaveBeenCalledWith({ parent: parent.id });
        expect(getNewSortOrder).toHaveBeenCalledWith(null, 'target', 'position', siblings);
        expect(cb).not.toBeCalled();
      });
    });
  });

  describe.skip('tableCopy method', () => {
    it('should load relevant nodes', () => {
      const nodes = ['Copy node', 'Target node'].map(title => ({
        id: uuid4(),
        channel_id: uuid4(),
        root_id: uuid4(),
        parent: uuid4(),
        source_node_id: uuid4(),
        original_source_node_id: uuid4(),
        node_id: uuid4(),
        title,
      }));
      const [copyNode, targetNode] = nodes;

      let getNewParentAndSiblings = mockMethod('getNewParentAndSiblings', () => {
        return Promise.resolve({ parent: targetNode.id, siblings: [] });
      });

      let requestModel = mockMethod('requestModel', id => {
        return Promise.resolve(nodes.find(n => n.id === id));
      });

      const excluded_descendants = {};
      return ContentNode.tableCopy(
        copyNode.id,
        targetNode.id,
        RELATIVE_TREE_POSITIONS.FIRST_CHILD,
        excluded_descendants
      )
        .then(newNode => {
          expect(newNode.id).not.toEqual(copyNode.id);
          expect(newNode).toMatchObject({
            title: copyNode.title,
            published: false,
            changed: true,
            original_source_node_id: copyNode.original_source_node_id,
            lft: 1,
            source_channel_id: copyNode.channel_id,
            source_node_id: copyNode.node_id,
            parent: targetNode.id,
            root_id: targetNode.root_id,
            channel_id: targetNode.channel_id,
            [COPYING_FLAG]: true,
            [TASK_ID]: null,
          });

          expect(getNewParentAndSiblings).toHaveBeenCalledWith(
            targetNode.id,
            RELATIVE_TREE_POSITIONS.FIRST_CHILD
          );
          expect(requestModel).toHaveBeenNthCalledWith(1, copyNode.id);
          expect(requestModel).toHaveBeenNthCalledWith(2, targetNode.id);

          return db[CHANGES_TABLE].where({
            '[table+key]': [ContentNode.tableName, newNode.id],
          }).first();
        })
        .then(change => {
          expect(change).toMatchObject({
            from_key: copyNode.id,
            target: targetNode.id,
            position: RELATIVE_TREE_POSITIONS.LAST_CHILD,
            excluded_descendants,
            mods: {},
            source: CLIENTID,
            oldObj: null,
            table: ContentNode.tableName,
            type: CHANGE_TYPES.COPIED,
          });
        });
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
      return ContentNodePrerequisite.put(cyclic).then(() => {
        return ContentNode.getRequisites('id-integrals').then(entries => {
          expect(sortBy(entries, 'target_node')).toEqual(
            sortBy(mappings.concat([cyclic]), 'target_node')
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
