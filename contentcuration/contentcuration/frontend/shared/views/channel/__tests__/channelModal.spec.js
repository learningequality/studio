import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import ChannelModal from './../ChannelModal';
import storeFactory from 'shared/vuex/baseStore';

Vue.use(VueRouter);

const TESTROUTE = 'test channel modal route';
const router = new VueRouter({
  routes: [
    {
      name: TESTROUTE,
      path: '/testroute',
      props: true,
      component: ChannelModal,
    },
  ],
});

const store = storeFactory();
const channelId = '11111111111111111111111111111111';

function makeWrapper() {
  router.push({
    name: TESTROUTE,
    params: {
      channelId,
    },
  });
  return mount(ChannelModal, {
    router,
    store,
    propsData: {
      channelId,
    },
    computed: {
      channel() {
        return {
          name: 'test',
          deleted: false,
          edit: true,
          id: channelId,
          content_defaults: {},
        };
      },
    },
  });
}

describe('channelModal', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('clicking close should close the modal', () => {
    let close = jest.fn();
    wrapper.setMethods({ close });
    wrapper.find('[data-test="close"]').trigger('click');
    expect(close).toHaveBeenCalled();
  });
});
