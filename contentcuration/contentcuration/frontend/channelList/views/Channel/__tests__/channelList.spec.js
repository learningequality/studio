import { mount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import ChannelList from '../ChannelList.vue';
import { ChannelListTypes } from 'shared/constants';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const GETTERS = {
  channel: {
    getChannels: jest.fn().mockReturnValue(() => []),
  },
};

const ACTIONS = {
  channel: {
    loadChannelList: jest.fn(),
    createChannel: jest.fn(),
  },
};

function makeWrapper({ propsData = {}, getters = GETTERS, actions = ACTIONS } = {}) {
  const router = new VueRouter({});
  const store = new Store({
    modules: {
      channel: {
        namespaced: true,
        state: {
          page: {},
        },
        getters: getters.channel,
        actions: actions.channel,
      },
    },
  });

  return mount(ChannelList, {
    propsData,
    localVue,
    router,
    store,
    stubs: ['Pagination'],
  });
}

const getNewChannelButton = wrapper => {
  return wrapper.find('[data-test="add-channel"]');
};

describe('ChannelList', () => {
  describe('non-editable', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({ propsData: { listType: ChannelListTypes.VIEW_ONLY } });
    });

    it("shouldn't show the new channel button", () => {
      expect(getNewChannelButton(wrapper).exists()).toBe(false);
    });
  });

  describe('editable', () => {
    let wrapper, createChannelMock;

    beforeEach(() => {
      jest.clearAllMocks();
      createChannelMock = jest.fn();

      const actions = {
        ...ACTIONS,
        channel: {
          ...ACTIONS.channel,
          createChannel: createChannelMock,
        },
      };
      wrapper = makeWrapper({ propsData: { listType: ChannelListTypes.EDITABLE }, actions });
    });

    it('should show the new channel button', () => {
      expect(getNewChannelButton(wrapper).exists()).toBe(true);
    });

    it('should create a new channel when new channel button is clicked', () => {
      getNewChannelButton(wrapper).trigger('click');
      expect(createChannelMock).toHaveBeenCalled();
    });
  });
});
