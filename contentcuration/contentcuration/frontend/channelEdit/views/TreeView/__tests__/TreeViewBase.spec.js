import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import cloneDeep from 'lodash/cloneDeep';

import TreeViewBase from '../TreeViewBase';
import { RouteNames } from '../../../constants';
import storeFactory from 'shared/vuex/baseStore';
import DraggablePlugin from 'shared/vuex/draggablePlugin';
import { RouteNames as ChannelRouteNames } from 'frontend/channelList/constants';

// Mock useKResponsiveWindow composable
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useKResponsiveWindow =
  require('kolibri-design-system/lib/composables/useKResponsiveWindow').default;

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
  windowIsSmall = false,
} = {}) => {
  // Mock the responsive window composable - return plain values
  useKResponsiveWindow.mockReturnValue({
    windowIsSmall,
    windowIsMedium: false,
    windowIsLarge: !windowIsSmall,
    windowHeight: 768,
    windowWidth: windowIsSmall ? 360 : 1024,
    windowBreakpoint: windowIsSmall ? 0 : 4,
  });

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

      const wrapper = initWrapper({ getters, windowIsSmall: true });
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
      expect(submitItem.label).toContain('Submit to Community Library');
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

  describe('channelMenuOptions computed property', () => {
    it('includes publish, view details, and edit channel on small screens', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.canEdit = () => true;

      const wrapper = initWrapper({ getters, windowIsSmall: true });
      const values = wrapper.vm.channelMenuOptions.map(item => item.value);
      expect(values).toContain('publish');
      expect(values).toContain('view-details');
      expect(values).toContain('edit-channel');
    });

    it('omits publish, view details, and edit channel on large screens', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.canEdit = () => true;

      const wrapper = initWrapper({ getters, windowIsSmall: false });
      const values = wrapper.vm.channelMenuOptions.map(item => item.value);
      expect(values).not.toContain('publish');
      expect(values).not.toContain('view-details');
      expect(values).not.toContain('edit-channel');
    });

    it('marks the edit channel option with a warning icon when language is missing', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canEdit = () => true;
      getters.currentChannel.currentChannel = () => createChannel({ language: null });

      const wrapper = initWrapper({ getters, windowIsSmall: true });
      const editOption = wrapper.vm.channelMenuOptions.find(item => item.value === 'edit-channel');
      expect(editOption.icon).toBe('warningIncomplete');
    });

    it('includes submit to community library on small screens when the user can submit', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () =>
        createChannel({ published: true, public: false });

      const wrapper = initWrapper({ getters, windowIsSmall: true });
      const values = wrapper.vm.channelMenuOptions.map(item => item.value);
      expect(values).toContain('submit-to-library');
    });

    it('omits submit to community library on large screens', () => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.canManage = () => true;
      getters.currentChannel.currentChannel = () =>
        createChannel({ published: true, public: false });

      const wrapper = initWrapper({ getters, windowIsSmall: false });
      const values = wrapper.vm.channelMenuOptions.map(item => item.value);
      expect(values).not.toContain('submit-to-library');
    });
  });

  describe('handleChannelMenuSelect method', () => {
    it('opens the publish side panel for the publish option', () => {
      const wrapper = initWrapper();
      wrapper.vm.handleChannelMenuSelect({ value: 'publish' });
      expect(wrapper.vm.showPublishSidePanel).toBe(true);
    });

    it('opens the delete modal for the delete option', () => {
      const wrapper = initWrapper();
      wrapper.vm.handleChannelMenuSelect({ value: 'delete' });
      expect(wrapper.vm.showDeleteModal).toBe(true);
    });

    it('opens the sync modal for the sync option', () => {
      const wrapper = initWrapper();
      wrapper.vm.handleChannelMenuSelect({ value: 'sync' });
      expect(wrapper.vm.showSyncModal).toBe(true);
    });

    it('navigates to the edit channel page for the edit channel option', () => {
      const wrapper = initWrapper();
      const push = jest.spyOn(wrapper.vm.$router, 'push').mockImplementation(() => {});
      wrapper.vm.handleChannelMenuSelect({ value: 'edit-channel' });
      expect(push).toHaveBeenCalledWith(wrapper.vm.editChannelLink);
    });

    it('opens the submit to community library panel for the shared submit option', () => {
      const wrapper = initWrapper();
      wrapper.vm.handleChannelMenuSelect({ value: 'submit-to-library' });
      expect(wrapper.vm.showSubmitToCommunityLibrarySidePanel).toBe(true);
    });
  });

  describe('handleShareMenuSelect method', () => {
    it('opens the token modal for the share token option', () => {
      const wrapper = initWrapper();
      wrapper.vm.handleShareMenuSelect({ value: 'share-token' });
      expect(wrapper.vm.showTokenModal).toBe(true);
    });

    it('opens the submit to community library panel for the submit option', () => {
      const wrapper = initWrapper();
      wrapper.vm.handleShareMenuSelect({ value: 'submit-to-library' });
      expect(wrapper.vm.showSubmitToCommunityLibrarySidePanel).toBe(true);
    });
  });
});
