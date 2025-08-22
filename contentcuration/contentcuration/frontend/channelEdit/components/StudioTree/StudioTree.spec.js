import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import StudioTree from './StudioTree';
import { createStore } from 'shared/vuex/draggablePlugin/test/setup';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

const localVue = createLocalVue();
localVue.use(Vuex);

const ROOT_ID = 'tree-id';
const NODE_ID = 'node-id';

async function nextTickWaitFor(wrapper, callback, maxTries = 3) {
  let tries = 0;

  do {
    await wrapper.vm.$nextTick();
    if (callback()) {
      return Promise.resolve();
    }
    tries++;
  } while (tries < maxTries);

  return Promise.reject('Exceeded maximum tries waiting');
}

const initWrapper = ({ getters = {}, mutations = {}, actions = {}, propsData = {} } = {}) => {
  const store = createStore({
    modules: {
      contentNode: {
        namespaced: true,
        getters: {
          getContentNode: () => jest.fn(),
          getContentNodeChildren: () => jest.fn(),
          nodeExpanded: () => jest.fn(),
          isNodeInCopyingState: () => jest.fn(),
          ...getters,
        },
        mutations: {
          TOGGLE_EXPANSION: jest.fn(),
          SET_EXPANSION: jest.fn(),
          ...mutations,
        },
        actions: {
          loadChildren: jest.fn(),
          loadContentNode: jest.fn(),
          ...actions,
        },
      },
      contextMenu: {
        namespaced: true,
        getters: {
          currentContextMenu: jest.fn(),
        },
        mutations: {
          SET_CONTEXT_MENU: jest.fn(),
        },
      },
      currentChannel: {
        namespaced: true,
        getters: {
          canEdit: () => true,
        },
      },
    },
  });

  return mount(StudioTree, {
    propsData: {
      treeId: ROOT_ID,
      nodeId: NODE_ID,
      onNodeClick: jest.fn(),
      ...propsData,
    },
    localVue,
    store,
    stubs: ['ContentNodeOptions'],
  });
};

function getItems(wrapper) {
  return wrapper.findAll('[data-test="item"]');
}

describe('StudioTree', () => {
  it('smoke test', () => {
    const wrapper = initWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  describe('when mounted', () => {
    it('commits a mutation to expand a node when a node is selected', () => {
      const mockSetExpansion = jest.fn();
      initWrapper({
        propsData: {
          nodeId: NODE_ID,
          selectedNodeId: NODE_ID,
        },
        mutations: { SET_EXPANSION: mockSetExpansion },
      });

      expect(mockSetExpansion).toHaveBeenCalledTimes(1);
      expect(mockSetExpansion).toHaveBeenCalledWith({}, { id: NODE_ID, expanded: true });
    });

    it("doesn't commit a mutation to expand a node when a node is not selected", () => {
      const mockSetExpansion = jest.fn();
      initWrapper({
        propsData: {
          nodeId: NODE_ID,
          selectedNodeId: '',
        },
        mutations: { SET_EXPANSION: mockSetExpansion },
      });

      expect(mockSetExpansion).not.toHaveBeenCalled();
    });

    describe('when a node is not expanded', () => {
      let getters;

      beforeEach(() => {
        getters = {
          nodeExpanded: () => () => false,
        };
      });

      it("doesn't dispatch load node action", () => {
        const mockLoadContentNode = jest.fn();
        initWrapper({
          getters,
          actions: { loadContentNode: mockLoadContentNode },
        });

        expect(mockLoadContentNode).not.toHaveBeenCalled();
      });

      it("doesn't dispatch load children action", () => {
        const mockLoadChildren = jest.fn();
        initWrapper({
          getters,
          actions: { loadChildren: mockLoadChildren },
        });

        expect(mockLoadChildren).not.toHaveBeenCalled();
      });
    });

    describe('when a node is expanded', () => {
      let getters;

      beforeEach(() => {
        getters = {
          nodeExpanded: () => () => true,
        };
      });

      it('dispatches load node action when a node has not been fetched yet', () => {
        const mockLoadContentNode = jest.fn();
        initWrapper({
          getters: {
            ...getters,
            getContentNode: () => jest.fn(),
          },
          actions: { loadContentNode: mockLoadContentNode },
        });

        expect(mockLoadContentNode).toHaveBeenCalledTimes(1);
        expect(mockLoadContentNode.mock.calls[0][1]).toBe(NODE_ID);
      });

      it("doesn't dispatch load node action when a node has been already fetched", () => {
        const mockLoadContentNode = jest.fn();
        initWrapper({
          getters: {
            ...getters,
            getContentNode: () => () => ({ title: 'Node' }),
          },
          actions: { loadContentNode: mockLoadContentNode },
        });

        expect(mockLoadContentNode).not.toHaveBeenCalled();
      });

      it('dispatches load children action if node has some resources', () => {
        const mockLoadChildren = jest.fn();
        initWrapper({
          getters: {
            ...getters,
            getContentNode: () => () => ({ total_count: 2 }),
          },
          actions: { loadChildren: mockLoadChildren },
        });

        expect(mockLoadChildren).toHaveBeenCalledTimes(1);
        expect(mockLoadChildren.mock.calls[0][1]).toEqual({ parent: NODE_ID });
      });

      it("doesn't dispatch load children action if node has no resources", () => {
        const mockLoadChildren = jest.fn();
        initWrapper({
          getters: {
            ...getters,
            getContentNode: () => () => ({ total_count: 0 }),
          },
          actions: { loadChildren: mockLoadChildren },
        });

        expect(mockLoadChildren).not.toHaveBeenCalled();
      });
    });
  });

  describe('tree rendering', () => {
    let getters;

    beforeEach(() => {
      /*
        Prepare a tree structure common to all tests of this group:
        root-topic
          document-1
          exercise-1
          subtopic-1
            subsubtopic-1
            subsubtopic-2
            document-2
          subtopic-2
      */
      const contentNodes = {
        'root-topic': {
          id: 'root-topic',
          kind: ContentKindsNames.TOPIC,
          title: 'Root topic',
          total_count: 4,
          resource_count: 2,
        },
        'document-1': {
          id: 'document-1',
          kind: ContentKindsNames.DOCUMENT,
        },
        'exercise-1': {
          id: 'exercise-1',
          kind: ContentKindsNames.EXERCISE,
          title: 'Exercise 1',
        },
        'subtopic-1': {
          id: 'subtopic-1',
          kind: ContentKindsNames.TOPIC,
          title: 'Subtopic 1',
          total_count: 3,
          resource_count: 1,
        },
        'subtopic-2': {
          id: 'subtopic-2',
          kind: ContentKindsNames.TOPIC,
          title: 'Subtopic 2',
          total_count: 0,
          resource_count: 0,
        },
        'subsubtopic-1': {
          id: 'subsubtopic-1',
          kind: ContentKindsNames.TOPIC,
          title: 'Subsubtopic 1',
          total_count: 0,
          resource_count: 0,
        },
        'subsubtopic-2': {
          id: 'subsubtopic-2',
          kind: ContentKindsNames.TOPIC,
          title: 'Subsubtopic 2',
          total_count: 0,
          resource_count: 0,
        },
        'document-2': {
          id: 'document-2',
          kind: ContentKindsNames.DOCUMENT,
          title: 'Document 2',
        },
      };
      const contentNodesChildren = {
        'root-topic': [
          contentNodes['document-1'],
          contentNodes['exercise-1'],
          contentNodes['subtopic-1'],
          contentNodes['subtopic-2'],
        ],
        'subtopic-1': [
          contentNodes['subsubtopic-1'],
          contentNodes['subsubtopic-2'],
          contentNodes['document-2'],
        ],
        'subtopic-2': [],
        'subsubtopic-1': [],
        'subsubtopic-2': [],
      };

      getters = {
        getContentNode: jest.fn().mockImplementation(() => nodeId => {
          return contentNodes[nodeId];
        }),
        getContentNodeChildren: jest.fn().mockImplementation(() => nodeId => {
          return contentNodesChildren[nodeId];
        }),
      };
    });

    it("renders all root topic's children that are topics but only direct children are visible", async () => {
      const wrapper = initWrapper({
        propsData: { nodeId: 'root-topic', root: true },
        getters,
      });
      await nextTickWaitFor(wrapper, () => Boolean(getItems(wrapper).length));

      const items = getItems(wrapper);
      expect(items.length).toBe(4);

      expect(items.at(0).html()).toContain('Subtopic 1');
      expect(items.at(0).isVisible()).toBe(true);

      expect(items.at(1).html()).toContain('Subsubtopic 1');
      expect(items.at(1).isVisible()).toBe(false);

      expect(items.at(2).html()).toContain('Subsubtopic 2');
      expect(items.at(2).isVisible()).toBe(false);

      expect(items.at(3).html()).toContain('Subtopic 2');
      expect(items.at(3).isVisible()).toBe(true);
    });

    it('renders subtopics of an expanded topic', async () => {
      const wrapper = initWrapper({
        propsData: { nodeId: 'root-topic', root: true },
        getters: {
          ...getters,
          nodeExpanded: jest.fn().mockImplementation(() => nodeId => nodeId === 'subtopic-1'),
        },
      });
      await nextTickWaitFor(wrapper, () => Boolean(getItems(wrapper).length));

      const items = getItems(wrapper);
      expect(items.length).toBe(4);

      expect(items.at(0).html()).toContain('Subtopic 1');
      expect(items.at(0).isVisible()).toBe(true);

      expect(items.at(1).html()).toContain('Subsubtopic 1');
      expect(items.at(1).isVisible()).toBe(true);

      expect(items.at(2).html()).toContain('Subsubtopic 2');
      expect(items.at(2).isVisible()).toBe(true);

      expect(items.at(3).html()).toContain('Subtopic 2');
      expect(items.at(3).isVisible()).toBe(true);
    });

    it("doesn't render edit menu by default", async () => {
      const wrapper = initWrapper({
        propsData: { nodeId: 'root-topic', root: true },
        getters,
      });
      await nextTickWaitFor(
        wrapper,
        () => !wrapper.findComponent('[data-test="editMenu"]').exists(),
      );
      expect(wrapper.findComponent('[data-test="editMenu"]').exists()).toBe(false);
    });

    it('renders edit menu when editing is allowed', async () => {
      const wrapper = initWrapper({
        propsData: { nodeId: 'root-topic', root: true, allowEditing: true },
        getters,
      });

      await nextTickWaitFor(wrapper, () =>
        wrapper.findComponent('[data-test="editMenu"]').exists(),
      );
      expect(wrapper.findComponent('[data-test="editMenu"]').exists()).toBe(true);
    });

    it("doesn't display context edit menu on right-click by default", async () => {
      const wrapper = initWrapper({
        propsData: { nodeId: 'root-topic', root: true },
        getters,
      });
      await nextTickWaitFor(wrapper, () => Boolean(getItems(wrapper).length));
      const item = getItems(wrapper).at(0);
      item.trigger('contextmenu');

      await nextTickWaitFor(
        wrapper,
        () => !item.findComponent('[data-test="contextMenu"]').exists(),
      );
      expect(item.findComponent('[data-test="contextMenu"]').exists()).toBe(false);
    });

    it('displays context edit menu on right-click when editing is allowed', async () => {
      const wrapper = initWrapper({
        propsData: { nodeId: 'root-topic', root: true, allowEditing: true },
        getters,
      });
      await nextTickWaitFor(wrapper, () => Boolean(getItems(wrapper).length));
      const item = getItems(wrapper).at(0);
      item.trigger('contextmenu');

      await nextTickWaitFor(wrapper, () =>
        item.findComponent('[data-test="contextMenu"]').exists(),
      );
      const menu = item.findAll('[data-test="contextMenu"]').at(0);
      expect(menu.isVisible()).toBe(true);
    });

    it('emits a click event when a subtopic of a root topic is clicked', async () => {
      const mockOnNodeClick = jest.fn();
      const wrapper = initWrapper({
        propsData: { nodeId: 'root-topic', root: true, onNodeClick: mockOnNodeClick },
        getters,
      });
      await nextTickWaitFor(wrapper, () => Boolean(getItems(wrapper).length));
      const items = getItems(wrapper);
      const subTopic2 = items.at(3);
      subTopic2.trigger('click');

      expect(mockOnNodeClick).toHaveBeenCalledTimes(1);
      expect(mockOnNodeClick).toHaveBeenCalledWith('subtopic-2');
    });

    it("doesn't render expansion toggle when a topic has no subtopics", async () => {
      const wrapper = initWrapper({
        propsData: { nodeId: 'root-topic', root: true },
        getters,
      });
      await nextTickWaitFor(wrapper, () => Boolean(getItems(wrapper).length));
      const items = getItems(wrapper);
      const subTopic2 = items.at(3);

      expect(subTopic2.findComponent('[data-test="expansionToggle"]').exists()).toBe(false);
    });

    it('renders expansion toggle when a topic contains subtopics', async () => {
      const wrapper = initWrapper({
        propsData: { nodeId: 'root-topic', root: true },
        getters,
      });
      await nextTickWaitFor(wrapper, () => Boolean(getItems(wrapper).length));
      const items = getItems(wrapper);
      const subTopic1 = items.at(0);

      expect(subTopic1.findComponent('[data-test="expansionToggle"]').exists()).toBe(true);
    });

    it('commits toggle mutation when expansion toggle is clicked', async () => {
      const mockToggleExpansion = jest.fn();
      const wrapper = initWrapper({
        propsData: { nodeId: 'root-topic', root: true },
        getters,
        mutations: {
          TOGGLE_EXPANSION: mockToggleExpansion,
        },
      });
      await nextTickWaitFor(wrapper, () => Boolean(getItems(wrapper).length));
      const items = getItems(wrapper);
      const subTopic1 = items.at(0);
      subTopic1.find('[data-test="expansionToggle"]').trigger('click');

      expect(mockToggleExpansion).toHaveBeenCalledTimes(1);
      expect(mockToggleExpansion.mock.calls[0][1]).toBe('subtopic-1');
    });
  });
});
