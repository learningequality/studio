import { mount } from '@vue/test-utils';
import store from '../../../store';
import router from '../../../router';
import ChannelList from '../ChannelList.vue';
import { ChannelListTypes } from 'shared/constants';

function makeWrapper(listType, newChannelStub) {
  return mount(ChannelList, {
    router,
    store,
    propsData: {
      listType: listType,
    },
    methods: {
      newChannel: newChannelStub,
    },
  });
}

describe('channelList', () => {
  it('should only show the new channel button on edit mode', () => {
    const wrapper = makeWrapper(ChannelListTypes.EDITABLE);
    expect(wrapper.find('[data-test="add-channel"]').exists()).toBe(true);
    let viewWrapper = makeWrapper(ChannelListTypes.VIEW_ONLY);
    expect(viewWrapper.find('[data-test="add-channel"]').exists()).toBe(false);
  });
  it('should create a new channel when new channel button is clicked', () => {
    const newChannelStub = jest.fn();
    const wrapper = makeWrapper(ChannelListTypes.EDITABLE, newChannelStub);
    wrapper.find('[data-test="add-channel"]').trigger('click');
    expect(newChannelStub).toHaveBeenCalled();
  });
});
