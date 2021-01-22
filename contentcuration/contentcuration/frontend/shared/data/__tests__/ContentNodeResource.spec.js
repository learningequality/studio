import sortBy from 'lodash/sortBy';
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
    mocks.forEach(mock => mock.mockRestore());
    return ContentNode.table.clear();
  });

  function mockContentNodeFunc(name, implementation) {
    const mock = jest.spyOn(ContentNode, name).mockImplementation(implementation);
    mocks.push(mock);
    return mock;
  }

  describe('tableCopy method', () => {
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

      let getNewParentAndSiblings = mockContentNodeFunc('getNewParentAndSiblings', () => {
        return Promise.resolve({ parent: targetNode.id, siblings: [] });
      });

      let requestModel = mockContentNodeFunc('requestModel', id => {
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
