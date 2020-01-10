import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import store from '../../../store';
import router from '../../../router';
import { RouterNames, ListTypes } from '../../../constants';
import ChannelList from '../ChannelList.vue';

Vue.use(Vuetify);
Vue.use(VueRouter);

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
  it('should create a new channel when new channel button is clicked', () => {
    wrapper.find('[data-test="add-channel"]').trigger('click');
    expect(Object.values(store.state.channelList.channelsMap)).toHaveLength(1);
    expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNEL_EDIT);
  });
});
