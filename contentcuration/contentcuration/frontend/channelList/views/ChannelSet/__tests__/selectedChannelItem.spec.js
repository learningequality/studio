import { mount } from '@vue/test-utils';
import store from '../../../store';
import SelectedChannelItem from '../SelectedChannelItem.vue';

const channelId = 'testing';
store.commit('channel/ADD_CHANNEL', { id: channelId });

function makeWrapper() {
  return mount(SelectedChannelItem, {
    store,
    sync: false,
    propsData: { channelId },
  });
}

describe('selectedChannelItem', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('clicking remove button in dialog should emit a remove event', () => {
    wrapper.find('[data-test="remove"]').trigger('click');
    expect(wrapper.emitted('remove')[0][0]).toEqual(channelId);
  });
});
