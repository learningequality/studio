import { mount } from '@vue/test-utils';
import store from '../../../store';
import router from '../../../router';
import { ListTypes } from '../../../constants';
import ChannelList from '../ChannelList.vue';

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
    const wrapper = makeWrapper(ListTypes.EDITABLE);
    expect(wrapper.find('[data-test="add-channel"]').exists()).toBe(true);
    let viewWrapper = makeWrapper(ListTypes.VIEW_ONLY);
    expect(viewWrapper.find('[data-test="add-channel"]').exists()).toBe(false);
  });
  it('should create a new channel when new channel button is clicked', () => {
    const newChannelStub = jest.fn();
    const wrapper = makeWrapper(ListTypes.EDITABLE, newChannelStub);
    wrapper.find('[data-test="add-channel"]').trigger('click');
    expect(newChannelStub).toHaveBeenCalled();
  });
});
