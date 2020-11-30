import { DraggableIdentityHelper } from '../utils';

const testIdentity = {
  id: 'item1',
  type: 'item',
  universe: 'testing',
  metadata: 'abc',
  ancestors: [
    {
      id: 'collection1',
      type: 'collection',
      universe: 'testing',
      metadata: null,
      ancestors: [
        {
          id: 'region1',
          type: 'region',
          universe: 'testing',
          metadata: null,
          ancestors: [],
        },
      ],
    },
    {
      id: 'region1',
      type: 'region',
      universe: 'testing',
      metadata: null,
      ancestors: [],
    },
  ],
};

describe('DraggableIdentityHelper', () => {
  it('should Proxy to identity', () => {
    const helper = new DraggableIdentityHelper(testIdentity);
    expect(helper.id).toEqual(testIdentity.id);
    expect(helper.type).toEqual(testIdentity.type);
    expect(helper.universe).toEqual(testIdentity.universe);
    expect(helper.ancestors).toEqual(testIdentity.ancestors);
    expect(helper.metadata).toEqual(testIdentity.metadata);
  });

  describe('get region()', () => {
    it('should return the region ancestor', () => {
      const helper = new DraggableIdentityHelper(testIdentity);
      expect(helper.region).toBeTruthy();
      expect(helper.region.id).toEqual('region1');
    });
  });

  describe('get collection()', () => {
    it('should return the collection ancestor', () => {
      const helper = new DraggableIdentityHelper(testIdentity);
      expect(helper.collection).toBeTruthy();
      expect(helper.collection.id).toEqual('collection1');
    });
  });

  describe('get item()', () => {
    it('should return the item ancestor', () => {
      const helper = new DraggableIdentityHelper(testIdentity);
      expect(helper.item).toBeFalsy();
    });
  });
});
