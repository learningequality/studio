import { mount } from '@vue/test-utils';
import ChannelDeleteSection from './../views/ChannelDeleteSection.vue';
import _ from 'underscore';
import { localStore, mockFunctions } from './data.js';


function makeWrapper(props = {}) {
  return mount(ChannelDeleteSection, {
    store: localStore
  })
}

describe('channelDeleteSection', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('clicking delete channel should open a dialog warning', () => {
    wrapper.find('.delete-channel').trigger('click');
    expect(mockFunctions.deleteChannel).not.toHaveBeenCalled();

    expect(document.querySelector('#dialog-box')).toBeTruthy();
    wrapper.vm.deleteChannel(wrapper.channel);
    expect(mockFunctions.deleteChannel).toHaveBeenCalled();
  });
});
