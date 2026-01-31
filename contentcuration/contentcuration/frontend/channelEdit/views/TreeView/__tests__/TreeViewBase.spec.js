import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import cloneDeep from 'lodash/cloneDeep';

import TreeViewBase from '../TreeViewBase';
import { RouteNames } from '../../../constants';
import storeFactory from 'shared/vuex/baseStore';
import DraggablePlugin from 'shared/vuex/draggablePlugin';
import { RouteNames as ChannelRouteNames } from 'frontend/channelList/constants';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const CHANNEL_ID = 'test-channel-id';
const ROOT_ID = 'root-id';

const createChannel = (overrides = {}) => ({
  id: CHANNEL_ID,
  name: 'Test Channel',
  published: false,
  public: false,
  language: 'en',
  ricecooker_version: null,
  ...overrides,
});

const GETTERS = {
  currentChannel: {
    currentChannel: () => createChannel(),
    canEdit: () => false,
    canManage: () => false,
    rootId: () => ROOT_ID,
  },
  contentNode: {
    getContentNode: () => () => ({
      error_count: 0,
      resource_count: 1,
      total_count: 1,
    }),
  },
};

const ACTIONS = {
  currentChannel: {
    loadChannel: jest.fn(() => Promise.resolve()),
  },
  channel: {
    deleteChannel: jest.fn(() => Promise.resolve()),
  },
};

const initWrapper = ({
  getters = GETTERS,
  actions = ACTIONS,
  channelOverrides = {},
  breakpoint = { smAndUp: true },
} = {}) => {
  const router = new VueRouter({
    routes: [
      {
        name: RouteNames.TREE_VIEW,
        path: '/:nodeId/:detailNodeId?',
      },
      {
        name: ChannelRouteNames.CHANNEL_EDIT,
        path: '/channels/:channelId/edit/:tab?',
      },
      {
        name: ChannelRouteNames.CHANNEL_DETAILS,
        path: '/channels/:channelId',
      },
    ],
  });

  router.push({
    name: RouteNames.TREE_VIEW,
    params: { nodeId: ROOT_ID },
  });

  const store = storeFactory({
    plugins: [DraggablePlugin],
    modules: {
      currentChannel: {
        namespaced: true,
        state: {
          currentChannelId: CHANNEL_ID,
        },
        getters: getters.currentChannel,
        actions: actions.currentChannel,
      },
      contentNode: {
        namespaced: true,
        getters: getters.contentNode,
      },
      channel: {
        namespaced: true,
        state: {
          channelsMap: {
            [CHANNEL_ID]: createChannel(channelOverrides),
          },
        },
        actions: actions.channel,
      },
    },
  });

  return mount(TreeViewBase, {
    localVue,
    router,
    store,
    propsData: {
      loading: false,
    },
    mocks: {
      $vuetify: {
        breakpoint: {
          smAndUp: breakpoint.smAndUp,
        },
      },
    },
    stubs: {
      ToolBar: {
        template: '<div><slot /><slot name="extension" /></div>',
      },
      MainNavigationDrawer: true,
      PublishSidePanel: true,
      SubmitToCommunityLibrarySidePanel: true,
      ResubmitToCommunityLibraryModal: true,
      ProgressModal: true,
      ChannelTokenModal: true,
      RemoveChannelModal: true,
      SyncResourcesModal: true,
      Clipboard: true,
      OfflineText: true,
      ContentNodeIcon: true,
      DraggablePlaceholder: true,
      SavingIndicator: true,
      QuickEditModal: true,
    },
  });
};

const getShareButton = wrapper => {
  return wrapper.find('.share-button');
};

describe('TreeViewBase', () => {
  describe('canShareChannel computed property', () => {
    it('returns true when user can manage channel', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () => createChannel({ published: false });

      const wrapper = initWrapper({ getters });
      expect(wrapper.vm.canShareChannel).toBe(true);
    });

    it('returns true when channel is published', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => false;
      getters.currentChannel.currentChannel = () => createChannel({ published: true });

      const wrapper = initWrapper({ getters });
      expect(wrapper.vm.canShareChannel).toBe(true);
    });

    it('returns true when user can manage and channel is published', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () => createChannel({ published: true });

      const wrapper = initWrapper({ getters });
      expect(wrapper.vm.canShareChannel).toBe(true);
    });

    it('returns false when user cannot manage and channel is not published', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => false;
      getters.currentChannel.currentChannel = () => createChannel({ published: false });

      const wrapper = initWrapper({ getters });
      expect(wrapper.vm.canShareChannel).toBe(false);
    });
  });

  describe('canSubmitToCommunityLibrary computed property', () => {
    it('returns true when user can manage, channel is published, and channel is not public', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () =>
        createChannel({ published: true, public: false });

      const wrapper = initWrapper({ getters });
      expect(wrapper.vm.canSubmitToCommunityLibrary).toBe(true);
    });

    it('returns false when user cannot manage', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => false;
      getters.currentChannel.currentChannel = () =>
        createChannel({ published: true, public: false });

      const wrapper = initWrapper({ getters });
      expect(wrapper.vm.canSubmitToCommunityLibrary).toBe(false);
    });

    it('returns false when channel is not published', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () =>
        createChannel({ published: false, public: false });

      const wrapper = initWrapper({ getters });
      expect(wrapper.vm.canSubmitToCommunityLibrary).toBe(false);
    });

    it('returns false when channel is public', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () =>
        createChannel({ published: true, public: true });

      const wrapper = initWrapper({ getters });
      expect(wrapper.vm.canSubmitToCommunityLibrary).toBe(false);
    });

    it('returns false when currentChannel is null', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () => null;

      const wrapper = initWrapper({ getters });
      expect(wrapper.vm.canSubmitToCommunityLibrary).toBe(false);
    });
  });

  describe('Share button visibility', () => {
    it('shows share button when user can manage channel', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () => createChannel({ published: false });

      const wrapper = initWrapper({ getters });
      expect(getShareButton(wrapper).exists()).toBe(true);
    });

    it('shows share button when channel is published', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => false;
      getters.currentChannel.currentChannel = () => createChannel({ published: true });

      const wrapper = initWrapper({ getters });
      expect(getShareButton(wrapper).exists()).toBe(true);
    });

    it('hides share button when user cannot manage and channel is not published', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => false;
      getters.currentChannel.currentChannel = () => createChannel({ published: false });

      const wrapper = initWrapper({ getters });
      expect(getShareButton(wrapper).exists()).toBe(false);
    });

    it('hides share button on small screens', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () => createChannel({ published: true });

      const wrapper = initWrapper({ getters, breakpoint: { smAndUp: false } });
      expect(getShareButton(wrapper).exists()).toBe(false);
    });
  });

  describe('Share menu items visibility', () => {
    it('shows submit to community library when user can submit', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () =>
        createChannel({ published: true, public: false });

      const wrapper = initWrapper({ getters });
      const menuOptions = wrapper.vm.shareMenuOptions;
      const submitItem = menuOptions.find(item => item.value === 'submit-to-library');
      expect(submitItem).toBeDefined();
      expect(submitItem.label).toContain('Submit to community library');
    });

    it('hides submit to community library when user cannot submit', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => false;
      getters.currentChannel.currentChannel = () =>
        createChannel({ published: true, public: false });

      const wrapper = initWrapper({ getters });
      const menuOptions = wrapper.vm.shareMenuOptions;
      const submitItem = menuOptions.find(item => item.value === 'submit-to-library');
      expect(submitItem).toBeUndefined();
    });

    it('hides submit to community library when channel is public', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () =>
        createChannel({ published: true, public: true });

      const wrapper = initWrapper({ getters });
      const menuOptions = wrapper.vm.shareMenuOptions;
      const submitItem = menuOptions.find(item => item.value === 'submit-to-library');
      expect(submitItem).toBeUndefined();
    });

    it('shows invite collaborators when user can manage', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () => createChannel({ published: false });

      const wrapper = initWrapper({ getters });
      const menuOptions = wrapper.vm.shareMenuOptions;
      const inviteItem = menuOptions.find(item => item.value === 'invite-collaborators');
      expect(inviteItem).toBeDefined();
      expect(inviteItem.label).toContain('Invite collaborators');
    });

    it('hides invite collaborators when user cannot manage', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => false;
      getters.currentChannel.currentChannel = () => createChannel({ published: true });

      const wrapper = initWrapper({ getters });
      const menuOptions = wrapper.vm.shareMenuOptions;
      const inviteItem = menuOptions.find(item => item.value === 'invite-collaborators');
      expect(inviteItem).toBeUndefined();
    });

    it('shows share token when channel is published', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => false;
      getters.currentChannel.currentChannel = () => createChannel({ published: true });

      const wrapper = initWrapper({ getters });
      const menuOptions = wrapper.vm.shareMenuOptions;
      const tokenItem = menuOptions.find(item => item.value === 'share-token');
      expect(tokenItem).toBeDefined();
      expect(tokenItem.label).toContain('Share token');
    });

    it('hides share token when channel is not published', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () => createChannel({ published: false });

      const wrapper = initWrapper({ getters });
      const menuOptions = wrapper.vm.shareMenuOptions;
      const tokenItem = menuOptions.find(item => item.value === 'share-token');
      expect(tokenItem).toBeUndefined();
    });

    it('shows all three menu items when all conditions are met', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () =>
        createChannel({ published: true, public: false });

      const wrapper = initWrapper({ getters });
      const menuOptions = wrapper.vm.shareMenuOptions;
      expect(menuOptions.length).toBe(3);
      expect(menuOptions.some(item => item.value === 'submit-to-library')).toBe(true);
      expect(menuOptions.some(item => item.value === 'invite-collaborators')).toBe(true);
      expect(menuOptions.some(item => item.value === 'share-token')).toBe(true);
    });
  });
});
