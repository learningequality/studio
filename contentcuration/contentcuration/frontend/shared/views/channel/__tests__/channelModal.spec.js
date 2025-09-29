import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import ChannelModal from './../ChannelModal';
import storeFactory from 'shared/vuex/baseStore';

const TESTROUTE = 'test channel modal route';
const router = new VueRouter({
  routes: [
    {
      name: TESTROUTE,
      path: '/testroute',
    },
  ],
});

const store = storeFactory();
const channelId = '11111111111111111111111111111111';
const tab = 'share';

function makeWrapper() {
  router
    .push({
      name: TESTROUTE,
      params: {
        channelId,
        tab,
      },
    })
    .catch(() => {});
  return mount(ChannelModal, {
    router,
    store,
    propsData: {
      channelId,
      tab,
    },
    computed: {
      channel() {
        return {
          name: 'test',
          deleted: false,
          id: channelId,
          content_defaults: {},
          editors: [],
          viewers: [],
          isNew: false,
        };
      },
    },
    stubs: {
      ChannelSharing: true,
    },
  });
}

describe('channelModal', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('clicking close should call cancelChanges', () => {
    const cancelChanges = jest.spyOn(wrapper.vm, 'cancelChanges');
    wrapper.findComponent('[data-test="close"]').trigger('click');
    expect(cancelChanges).toHaveBeenCalled();
  });

  it('when the current tab is share, the share content should display in the modal', async () => {
    expect(wrapper.vm.tab).toBe('share');
    expect(
      wrapper
        .findComponent('[data-test="share-content"]')
        .findComponent({ name: 'v-card' })
        .isVisible(),
    ).toBe(true);
    expect(
      wrapper
        .findComponent('[data-test="edit-content"]')
        .findComponent({ name: 'v-container' })
        .isVisible(),
    ).toBe(false);
  });

  it('when the current tab is edit, the edit content should display in the modal', async () => {
    await wrapper.setProps({ tab: 'edit' });
    expect(wrapper.vm.tab).toBe('edit');
    await wrapper.vm.$nextTick();
    expect(
      wrapper
        .findComponent('[data-test="edit-content"]')
        .findComponent({ name: 'v-container' })
        .isVisible(),
    ).toBe(true);
    expect(
      wrapper
        .findComponent('[data-test="share-content"]')
        .findComponent({ name: 'v-card' })
        .isVisible(),
    ).toBe(false);
  });
});
