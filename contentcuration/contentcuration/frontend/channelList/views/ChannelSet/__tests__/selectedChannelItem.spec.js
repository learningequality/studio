import Vue from 'vue';
import { mount } from '@vue/test-utils';
import Vuetify from 'vuetify';
import store from '../../../store';
import SelectedChannelItem from '../SelectedChannelItem.vue';

Vue.use(Vuetify);
const channelId = 'testing';
store.commit('channelList/ADD_CHANNEL', { id: channelId });

function makeWrapper() {
  const wrapper = mount(SelectedChannelItem, {
    store,
    sync: false,
    propsData: { channelId },
  });
  return wrapper;
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
