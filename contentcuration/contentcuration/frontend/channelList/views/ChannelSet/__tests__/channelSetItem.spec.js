import { mount } from '@vue/test-utils';
import { factory } from '../../../store';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import ChannelSetItem from '../ChannelSetItem.vue';

const store = factory();

const channelSet = {
  id: 'testing',
  channels: [],
  secret_token: '1234567890',
};

store.commit('channelSet/ADD_CHANNELSET', channelSet);

function makeWrapper(deleteStub) {
  const wrapper = mount(ChannelSetItem, {
    router,
    store,
    sync: false,
    propsData: { channelSetId: channelSet.id },
  });
  wrapper.setMethods({
    deleteChannelSet: deleteStub,
  });
  return wrapper;
}

describe('channelSetItem', () => {
  let wrapper;
  const deleteStub = jest.fn();
  beforeEach(() => {
    deleteStub.mockReset();
    wrapper = makeWrapper(deleteStub);
  });
  it('clicking the edit option should open the channel set edit modal', () => {
    wrapper.find('[data-test="edit"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouteNames.CHANNEL_SET_DETAILS);
  });
  it('clicking delete button in dialog should delete the channel set', () => {
    wrapper.vm.deleteDialog = true;
    wrapper.find('[data-test="delete"]').trigger('click');
    expect(deleteStub).toHaveBeenCalled();
  });
});
