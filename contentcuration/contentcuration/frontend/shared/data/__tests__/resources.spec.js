import { UpdatedDescendantsChange } from '../changes';
import { ViewerM2M, ChannelUser, Channel, ContentNode } from '../resources';
import db from 'shared/data/db';
import { CHANGE_TYPES, TABLE_NAMES } from 'shared/data/constants';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { mockChannelScope, resetMockChannelScope } from 'shared/utils/testing';
import client from 'shared/client';
import urls from 'shared/urls';

const CLIENTID = 'test-client-id';

const parentId = 'test-parent-id';
const childId = 'test-child-id';
const grandchildId = 'test-grandchild-id';

const contentNodes = [
  {
    id: parentId,
    title: 'test-title-1',
    kind: ContentKindsNames.TOPIC,
  },
  {
    id: childId,
    title: 'test-title-2',
    parent: parentId,
    kind: ContentKindsNames.TOPIC,
  },
  {
    id: grandchildId,
    title: 'test-title-3',
    parent: childId,
    kind: ContentKindsNames.VIDEO,
  },
];

describe('Resources', () => {
  const channel_id = 'test-123';
  beforeEach(async () => {
    await db[TABLE_NAMES.CONTENTNODE].clear();
    await db[TABLE_NAMES.CHANGES_TABLE].clear();
    await mockChannelScope(channel_id);

    await Promise.all(contentNodes.map(node => db[TABLE_NAMES.CONTENTNODE].add(node)));
  });

  afterEach(async () => {
    await resetMockChannelScope();
  });

  describe('ContentNode resource', () => {
    describe('Updated descendants changes', () => {
      const saveChange = async (changes, key = parentId) => {
        const change = new UpdatedDescendantsChange({
          key,
          table: TABLE_NAMES.CONTENTNODE,
          changes,
          source: CLIENTID,
        });

        const rev = await change.saveChange();
        return rev;
      };

      it('should get empty array if no data is passed', async () => {
        await saveChange({ lang: 'en' });

        const inheritedChanges = await ContentNode.getInheritedChanges([]);
        expect(inheritedChanges).toEqual([]);
      });

      it('should get empty array if no descendants changes have been made', async () => {
        const inheritedChanges = await ContentNode.getInheritedChanges([contentNodes[2]]);
        expect(inheritedChanges).toEqual([]);
      });

      it('should get empty array if no descendants changes have been made to the correct ascendants', async () => {
        await saveChange({ lang: 'en' }, 'test-123');
        const inheritedChanges = await ContentNode.getInheritedChanges([contentNodes[2]]);
        expect(inheritedChanges).toEqual([]);
      });

      it('should return the inherited changes for children', async () => {
        const rev = await saveChange({ lang: 'en' });
        const inheritedChanges = await ContentNode.getInheritedChanges([contentNodes[1]]);
        expect(inheritedChanges.length).toEqual(1);
        expect(inheritedChanges[0].rev).toEqual(rev);
      });

      it('should return the inherited changes for descendants', async () => {
        const rev = await saveChange({ lang: 'en' });
        const inheritedChanges = await ContentNode.getInheritedChanges([contentNodes[2]]);
        expect(inheritedChanges.length).toEqual(1);
        expect(inheritedChanges[0].rev).toEqual(rev);
      });

      it('descendants should inherit changes as "UPDATED" type of change for themsleves', async () => {
        await saveChange({ lang: 'en' });
        const [change] = await ContentNode.getInheritedChanges([contentNodes[2]]);
        expect(change.type).toEqual(CHANGE_TYPES.UPDATED);
        expect(change.key).toEqual(contentNodes[2].id);
      });

      it('should return multiple inherited changes', async () => {
        const revs = await Promise.all([saveChange({ lang: 'en' }), saveChange({ lang: 'es' })]);
        const inheritedChanges = await ContentNode.getInheritedChanges([contentNodes[1]]);
        expect(inheritedChanges.length).toEqual(revs.length);
        expect(inheritedChanges.map(change => change.rev)).toEqual(revs);
      });

      it('should return the inherited changes for multiple descendants', async () => {
        const rev = await saveChange({ lang: 'en' });
        const inheritedChanges = await ContentNode.getInheritedChanges([
          contentNodes[1],
          contentNodes[2],
        ]);
        expect(inheritedChanges.length).toEqual(2);

        const [first, second] = inheritedChanges;
        expect(first.rev).toEqual(rev);
        expect(second.rev).toEqual(rev);
        expect(first.key).toEqual(contentNodes[1].id);
        expect(second.key).toEqual(contentNodes[2].id);
      });

      it('should return the inherited changes from multiple ascendants', async () => {
        const revs = await Promise.all([
          saveChange({ lang: 'en' }, parentId),
          saveChange({ lang: 'es' }, childId),
        ]);
        const inheritedChanges = await ContentNode.getInheritedChanges([contentNodes[2]]);
        expect(inheritedChanges.length).toEqual(revs.length);
        expect(inheritedChanges.map(change => change.rev)).toEqual(revs);
      });
    });

    describe('Update descendants', () => {
      const changes = { lang: 'en' };
      it('should update the parent itself', async () => {
        await ContentNode.updateDescendants(parentId, changes);
        const node = await db[TABLE_NAMES.CONTENTNODE].get(parentId);
        expect(node).toEqual(expect.objectContaining(changes));
      });

      it('should update the children', async () => {
        await ContentNode.updateDescendants(parentId, changes);
        const node = await db[TABLE_NAMES.CONTENTNODE].get(childId);
        expect(node).toEqual(expect.objectContaining(changes));
      });

      it('should update the descendants', async () => {
        await ContentNode.updateDescendants(parentId, changes);
        const node = await db[TABLE_NAMES.CONTENTNODE].get(grandchildId);
        expect(node).toEqual(expect.objectContaining(changes));
      });

      it('shouldnt update other nodes', async () => {
        await ContentNode.updateDescendants('test-123', changes);
        const node = await db[TABLE_NAMES.CONTENTNODE].get(parentId);
        expect(node.language).not.toEqual(changes.lang);
      });

      it('should save a new UPDATED DESCENDANTS change', async () => {
        await ContentNode.updateDescendants(parentId, changes);

        const change = await db[TABLE_NAMES.CHANGES_TABLE]
          .where({
            type: CHANGE_TYPES.UPDATED_DESCENDANTS,
          })
          .first();
        expect(change).toBeDefined();
        expect(change.key).toEqual(parentId);
        expect(change.mods).toEqual(changes);
      });
    });
    describe('ChannelUser resource', () => {
      const testChannelId = 'test-channel-id';
      const testUserId = 'test-user-id';

      beforeEach(async () => {
        await db[TABLE_NAMES.VIEWER_M2M].clear();
        await db[TABLE_NAMES.CHANNEL].clear();
        jest.spyOn(client, 'delete').mockResolvedValue({});
        jest.spyOn(Channel.table, 'delete').mockResolvedValue(true);
        jest.spyOn(urls, 'channeluser_remove_self').mockReturnValue(`fake_url_for_${testUserId}`);
      });

      afterEach(() => {
        client.delete.mockRestore();
        Channel.table.delete.mockRestore();
        urls.channeluser_remove_self.mockRestore();
      });

      it('should remove the user from the ViewerM2M table when removeViewer is called', async () => {
        await ViewerM2M.add({ user: testUserId, channel: testChannelId });
        let viewer = await ViewerM2M.get([testUserId, testChannelId]);
        expect(viewer).toBeTruthy();

        await ChannelUser.removeViewer(testChannelId, testUserId);

        viewer = await ViewerM2M.get([testUserId, testChannelId]);
        expect(viewer).toBeUndefined();
        expect(client.delete).toHaveBeenCalledWith(urls.channeluser_remove_self(testUserId), {
          params: { channel_id: testChannelId },
        });
      });

      it('should call Channel.table.delete(channel) when removeViewer is called', async () => {
        await ViewerM2M.add({ user: testUserId, channel: testChannelId });
        const viewer = await ViewerM2M.get([testUserId, testChannelId]);
        expect(viewer).toBeTruthy();
        await ChannelUser.removeViewer(testChannelId, testUserId);
        expect(Channel.table.delete).toHaveBeenCalledWith(testChannelId);
      });

      it('should handle error from client.delete when removeViewer is called', async () => {
        jest.spyOn(client, 'delete').mockRejectedValue(new Error('error deleting'));
        await ViewerM2M.add({ user: testUserId, channel: testChannelId });
        await expect(ChannelUser.removeViewer(testChannelId, testUserId)).rejects.toThrow(
          'error deleting',
        );
      });
    });
  });
});
