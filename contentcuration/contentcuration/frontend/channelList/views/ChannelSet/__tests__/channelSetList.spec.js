import Vue from 'vue';
import { mount } from '@vue/test-utils';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';
import store from '../../../store';
import router from '../../../router';
import { RouterNames } from '../../../constants';
import ChannelSetList from '../ChannelSetList.vue';

Vue.use(Vuetify);
Vue.use(VueRouter);

function makeWrapper() {
  router.push({
    name: RouterNames.CHANNEL_SETS,
  });
  return mount(ChannelSetList, { store, router });
}

describe('channelSetList', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('should create a new channel set when new set button is clicked', () => {
    wrapper.setData({ loading: false });
    wrapper.find('[data-test="add-channelset"]').trigger('click');
    expect(Object.values(store.state.channelSet.channelSetsMap)).toHaveLength(1);
    expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNEL_SET_DETAILS);
  });
});
