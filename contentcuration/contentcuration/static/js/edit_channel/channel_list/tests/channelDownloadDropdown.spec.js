import { mount } from '@vue/test-utils';
import ChannelDownloadDropdown from './../views/ChannelDownloadDropdown.vue';
import { localStore, mockFunctions } from './data.js';

function makeWrapper() {
  return mount(ChannelDownloadDropdown, {
    store: localStore,
  });
}

const testChannel = { id: 'test', name: 'test' };
localStore.commit('channel_list/ADD_CHANNEL', testChannel);

describe('channelDownloadDropdown', () => {
  let wrapper;
  beforeEach(() => {
    localStore.commit('channel_list/SET_ACTIVE_CHANNEL', testChannel.id);
    mockFunctions.downloadChannelDetails.mockReset();
    wrapper = makeWrapper();
  });

  it('clicking a download link should trigger a download', () => {
    wrapper.find('li a').trigger('click');
    expect(mockFunctions.downloadChannelDetails).toHaveBeenCalled();
  });
  it('requesting a format should trigger corresponding format download', () => {
    function test(format) {
      wrapper.vm.downloadDetails(format);
      let args = mockFunctions.downloadChannelDetails.mock.calls[0][1];
      expect(args.format).toEqual(format);
      mockFunctions.downloadChannelDetails.mockReset();
    }
    test('pdf');
    test('csv');
    test('detailedPdf');
    test('ppt');
  });
});
