import sortBy from 'lodash/sortBy';
import { ContentNode, ContentNodePrerequisite } from 'shared/data/resources';

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
