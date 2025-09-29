import Vue from 'vue';
import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import cloneDeep from 'lodash/cloneDeep';

import { RouteNames } from '../../constants';
import TreeView from './index';
import storeFactory from 'shared/vuex/baseStore';
import DraggablePlugin from 'shared/vuex/draggablePlugin';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const NODE_ID = 'id-reading';

const GETTERS = {
  currentChannel: {
    currentChannel: () => jest.fn(),
    hasStagingTree: jest.fn(),
    stagingId: jest.fn(),
    rootId: jest.fn(),
    canEdit: jest.fn(() => true),
    canManage: jest.fn(() => true),
  },
  contentNode: {
    getContentNodeChildren: () => jest.fn(() => ({ results: [], more: null })),
    getContentNodeAncestors: () => jest.fn(() => []),
    getContentNode: () => jest.fn(() => ({})),
    getTopicAndResourceCounts: () => jest.fn(() => ({ topicCount: 0, resourceCount: 0 })),
  },
};

const ACTIONS = {
  contentNode: {
    loadAncestors: jest.fn(),
    loadContentNode: jest.fn(),
    headContentNode: () => jest.fn(),
    loadContentNodes: jest.fn(),
    loadChildren: jest.fn(() => ({ results: [], more: null })),
  },
};

const MUTATIONS = {
  contentNode: {
    COLLAPSE_ALL_EXPANDED: jest.fn(),
    SET_EXPANSION: jest.fn(),
  },
};

const initWrapper = ({ getters = GETTERS, actions = ACTIONS, mutations = MUTATIONS } = {}) => {
  const router = new VueRouter({
    routes: [
      {
        name: RouteNames.STAGING_TREE_VIEW,
        path: '/staging/:nodeId/:detailNodeId?',
      },
    ],
  });

  const store = storeFactory({
    plugins: [DraggablePlugin],
    modules: {
      currentChannel: {
        namespaced: true,
        getters: getters.currentChannel,
      },
      contentNode: {
        namespaced: true,
        getters: getters.contentNode,
        actions: actions.contentNode,
        mutations: mutations.contentNode,
      },
    },
  });

  const TreeViewBaseStub = Vue.component('TreeViewBase', {
    template: '<div><slot name="extension" /></div>',
  });

  return mount(TreeView, {
    propsData: {
      nodeId: NODE_ID,
    },
    localVue,
    router,
    store,
    // TreeViewBase is a temporary component containing
    // lots of logic related to modals that will be moved
    // to pages soon => just stub it for now
    // TODO: Remove the stub after the cleanup and rather
    // mock remaining getters, actions and mutations
    // to make clear what are the dependencies
    stubs: {
      TreeViewBase: TreeViewBaseStub,
    },
  });
};

const getStagingTreeBanner = wrapper => {
  return wrapper.find('[data-test="staging-tree-banner"]');
};

describe('TreeView', () => {
  it("doesn't render ready for review banner if a channel has no staging tree", () => {
    const getters = cloneDeep(GETTERS);
    getters.currentChannel.hasStagingTree = () => false;
    const wrapper = initWrapper({ getters });

    expect(getStagingTreeBanner(wrapper).exists()).toBe(false);
  });

  describe('if a channel has a staging tree', () => {
    let wrapper;

    beforeEach(() => {
      const getters = cloneDeep(GETTERS);
      getters.currentChannel.hasStagingTree = () => true;
      getters.currentChannel.stagingId = () => 'staging-tree-id';
      getters.currentChannel.currentChannel = () => {
        return {
          modified: '2020-07-13T14:35:55Z',
        };
      };
      wrapper = initWrapper({ getters });
    });

    it('renders ready for review banner', () => {
      expect(getStagingTreeBanner(wrapper).isVisible()).toBe(true);
    });

    it('renders modification time in ready for review banner', () => {
      expect(getStagingTreeBanner(wrapper).find('time').attributes('datetime')).toBe(
        '2020-07-13T14:35:55Z',
      );
    });

    it('renders a link to a channel staging tree page in ready for review banner', () => {
      expect(
        getStagingTreeBanner(wrapper).find('[data-test="staging-tree-link"]').attributes('href'),
      ).toBe('#/staging/staging-tree-id');
    });
  });
});
