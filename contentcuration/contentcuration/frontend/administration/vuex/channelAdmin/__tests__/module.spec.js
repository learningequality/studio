import channelAdmin from '../index';
import channel from 'shared/vuex/channel';
import storeFactory from 'shared/vuex/baseStore';
import client from 'shared/client';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

const userId = 'testId';

describe('channel admin actions', () => {
  let store;
  beforeEach(() => {
    store = storeFactory({
      modules: {
        channelAdmin,
        channel,
      },
    });
    store.state.session.currentUser.id = userId;
    client.get.mockClear();
    client.post.mockClear();
    client.delete.mockClear();
    client.patch.mockClear();
  });

  describe('getters', () => {
    const testList = ['test', 'channel', 'list'];
    beforeEach(() => {
      store.state.channelAdmin.pageData = {
        results: testList,
        count: testList.length,
      };
    });
    it('count should return page result count', () => {
      expect(store.getters['channelAdmin/count']).toEqual(testList.length);
    });
    it('users should return page results', () => {
      expect(store.getters['channelAdmin/channels']).toEqual(testList);
    });
  });
  describe('mutations', () => {
    const testChannel = { id: 'TESTING', testing: 'data1' };
    const testChannel2 = { id: 'LIST', testing: 'data2' };
    const testList = [testChannel, testChannel2];

    it('SET_PAGE_DATA should set the page data', () => {
      const testPage = {
        count: 100,
        total_pages: 5,
        results: [testChannel],
        page_number: 1,
      };
      store.commit('channelAdmin/SET_PAGE_DATA', testPage);
      expect(store.state.channelAdmin.pageData).toEqual({
        ...testPage,
        next: null,
        previous: null,
        results: [testChannel.id],
      });
    });
    it('REMOVE_CHANNEL should remove channel from pageData', () => {
      store.commit('channelAdmin/SET_PAGE_DATA', { results: testList, count: 1 });
      store.commit('channelAdmin/REMOVE_CHANNEL', testChannel.id);

      expect(store.state.channelAdmin.pageData.results).toEqual([testChannel2.id]);
      expect(store.state.channelAdmin.pageData.count).toBe(0);
    });
  });
  describe('actions', () => {
    describe('loadChannels', () => {
      beforeEach(() => {
        client.get.mockReturnValue(
          Promise.resolve({
            data: { results: [] },
          }),
        );
      });
      it('should call client.get with admin_channels_list', () => {
        return store.dispatch('channelAdmin/loadChannels', {}).then(() => {
          expect(client.get.mock.calls[0][0]).toBe('admin_channels_list');
        });
      });
      it('should call client.get with queries', () => {
        const keywords = 'testing';
        return store.dispatch('channelAdmin/loadChannels', { keywords }).then(() => {
          expect(client.get.mock.calls[0][1].params.keywords).toBe(keywords);
        });
      });
    });

    it('getAdminChannelListDetails should get details for given channel Ids', () => {
      const channelIds = ['TEST', 'CHANNEL', 'LIST'];
      return store.dispatch('channelAdmin/getAdminChannelListDetails', channelIds).then(() => {
        expect(client.get).toHaveBeenCalledWith('get_channel_details');
        expect(client.get.mock.calls).toHaveLength(channelIds.length);
      });
    });
    it('deleteChannel should call client.delete with admin_channels_detail', () => {
      return store.dispatch('channelAdmin/deleteChannel', 'testChannelId').then(() => {
        expect(client.delete).toHaveBeenCalledWith('admin_channels_detail');
      });
    });
    // TODO: client mock isn't working from within the resource layer
    // it('updateChannel should update the channel with the given data', () => {
    //   const id = 'TESTING';
    //   const testData = { id, public: true };
    //   return store.dispatch('channelAdmin/updateChannel', testData).then(() => {
    //     expect(client.patch).toHaveBeenCalledWith('admin_channels_detail');
    //   });
    // });
  });
});
