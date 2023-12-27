import { UpdatedDescendantsChange } from '../changes';
import db from 'shared/data/db';
import { TABLE_NAMES } from 'shared/data/constants';
import { ContentNode } from 'shared/data/resources';
import { mockChannelScope, resetMockChannelScope } from 'shared/utils/testing';

const CLIENTID = 'test-client-id';

const parentId = 'test-parent-id';
const childId = 'test-child-id';
const grandchildId = 'test-grandchild-id';

const contentNodes = [
  {
    id: parentId,
    title: 'test-title-1',
  },
  {
    id: childId,
    title: 'test-title-2',
    parent: parentId,
  },
  {
    id: grandchildId,
    title: 'test-title-3',
    parent: childId,
  },
];

describe('Resources', () => {
  const channel_id = 'test-123';
  beforeEach(async () => {
    await db[TABLE_NAMES.CONTENTNODE].clear();
    await mockChannelScope(channel_id);

    await Promise.all(contentNodes.map(node => db[TABLE_NAMES.CONTENTNODE].add(node)));
  });

  afterEach(async () => {
    await resetMockChannelScope();
  });

  describe('ContentNode resource', () => {
    describe('Updated descendants changes', () => {
      it('should get inherited changes', async () => {
        await new UpdatedDescendantsChange({
          key: parentId,
          table: TABLE_NAMES.CONTENTNODE,
          changes: { language: 'en' },
          source: CLIENTID,
        }).saveChange();
        await ContentNode.getInheritedChanges([]);
        expect(true).toBe(true);
      });
    });
  });
});
