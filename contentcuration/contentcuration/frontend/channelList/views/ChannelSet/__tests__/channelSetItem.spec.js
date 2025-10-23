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

function makeWrapper() {
  const wrapper = mount(ChannelSetItem, {
    router,
    store,
    sync: false,
    propsData: { channelSetId: channelSet.id },
  });
  const deleteChannelSet = jest.spyOn(wrapper.vm, 'deleteChannelSet');
  deleteChannelSet.mockImplementation(() => Promise.resolve());
  return [wrapper, { deleteChannelSet }];
}

describe('channelSetItem', () => {
  let wrapper, mocks;

  beforeEach(() => {
    [wrapper, mocks] = makeWrapper();
  });

  it('clicking the edit option should open the channel set edit modal', () => {
    // Simulate selecting the edit option from the dropdown
    wrapper.vm.handleOptionSelect({ value: 'edit' });
    expect(wrapper.vm.$route.name).toEqual(RouteNames.CHANNEL_SET_DETAILS);
  });

  it('clicking delete button in dialog should delete the channel set', () => {
    // Set deleteDialog to true and trigger handleDelete method
    wrapper.vm.deleteDialog = true;
    wrapper.vm.handleDelete();
    expect(mocks.deleteChannelSet).toHaveBeenCalled();
  });
});
