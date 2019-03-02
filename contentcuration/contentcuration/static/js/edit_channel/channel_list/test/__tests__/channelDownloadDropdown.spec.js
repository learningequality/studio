import { mount } from '@vue/test-utils';
import ChannelDownloadDropdown from './../../views/ChannelDownloadDropdown.vue';
import _ from 'underscore';
import { localStore, mockFunctions } from './../data.js';


function makeWrapper(props = {}) {
  return mount(ChannelDownloadDropdown, {
    store: localStore
  })
}

describe('channelDownloadDropdown', () => {
  let wrapper;
  beforeEach(() => {
    mockFunctions.downloadChannelDetails.mockReset();
    localStore.commit('channel_list/SET_ACTIVE_CHANNEL', {name: 'test'})
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
