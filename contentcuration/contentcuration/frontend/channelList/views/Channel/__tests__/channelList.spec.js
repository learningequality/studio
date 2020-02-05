import { mount } from '@vue/test-utils';
import flushPromises from 'flush-promises'
import store from '../../../store';
import router from '../../../router';
import { RouterNames, ListTypes } from '../../../constants';
import ChannelList from '../ChannelList.vue';

function makeWrapper(listType) {
  return mount(ChannelList, {
    router,
    store,
    propsData: {
      listType: listType || ListTypes.EDITABLE,
    },
  });
}

describe('channelList', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('should only show the new channel button on edit mode', () => {
    expect(wrapper.find('[data-test="add-channel"]').exists()).toBe(true);
    let viewWrapper = makeWrapper(ListTypes.VIEW_ONLY);
    expect(viewWrapper.find('[data-test="add-channel"]').exists()).toBe(false);
  });
  it('should create a new channel when new channel button is clicked', async () => {
    const newId = 'test';
    wrapper.vm.createChannel = jest.fn(() => Promise.resolve(newId));
    wrapper.find('[data-test="add-channel"]').trigger('click');
    expect(wrapper.vm.createChannel).toHaveBeenCalled();
    await flushPromises();
    expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNEL_EDIT);
  });
});
