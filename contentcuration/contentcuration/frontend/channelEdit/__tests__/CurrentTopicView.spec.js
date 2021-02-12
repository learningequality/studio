import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import cloneDeep from 'lodash/cloneDeep';

import { STORE_CONFIG } from '../store';
import router from '../router';
import CurrentTopicView from '../views/CurrentTopicView';
import { resetJestGlobal } from 'shared/utils/testing';
import storeFactory from 'shared/vuex/baseStore';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

const CHANNEL = {
  id: 'id-channel',
  name: 'Test channel',
  edit: false,
  ricecooker_version: null,
};

const TOPIC = {
  id: 'id-topic',
  parent: CHANNEL.id,
  title: 'Test topic',
  kind: ContentKindsNames.TOPIC,
};

const NODE_1 = {
  id: 'id-node-1',
  parent: TOPIC.id,
  title: 'Test node 1',
  kind: ContentKindsNames.DOCUMENT,
};

const NODE_2 = {
  id: 'id-node-2',
  parent: TOPIC.id,
  title: 'Test node 2',
  kind: ContentKindsNames.VIDEO,
};

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const makeWrapper = ({ store, topicId = TOPIC.id }) => {
  return mount(CurrentTopicView, {
    propsData: {
      topicId,
    },
    localVue,
    router,
    store,
  });
};

function getNodeListItems(wrapper) {
  return wrapper.findAll('[data-test="node-list-item"]');
}

function hasEditSelectedBtn(wrapper) {
  return wrapper.contains('[data-test="edit-selected-btn"]');
}

function hasCopySelectedToClipboardBtn(wrapper) {
  return wrapper.contains('[data-test="copy-selected-to-clipboard-btn"]');
}

function hasMoveSelectedBtn(wrapper) {
  return wrapper.contains('[data-test="move-selected-btn"]');
}

function hasDuplicateSelectedBtn(wrapper) {
  return wrapper.contains('[data-test="duplicate-selected-btn"]');
}

function hasDeleteSelectedBtn(wrapper) {
  return wrapper.contains('[data-test="delete-selected-btn"]');
}

function selectNode(wrapper, nodeIdx) {
  const nodeCheckbox = getNodeListItems(wrapper)
    .at(nodeIdx)
    .find('input[type="checkbox"]');
  nodeCheckbox.setChecked();
}

describe('CurrentTopicView', () => {
  it('smoke test', () => {
    const store = storeFactory(STORE_CONFIG);
    const wrapper = makeWrapper({ store });

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('for a topic with nodes', () => {
    let store, wrapper;

    beforeEach(() => {
      global.CHANNEL_EDIT_GLOBAL.channel_id = CHANNEL.id;

      const storeConfig = cloneDeep(STORE_CONFIG);
      // `loadChildren` call needs to be resolved for NodePanel
      //  to finish loading (see NodePanel's `created` hook)
      jest.spyOn(storeConfig.modules.contentNode.actions, 'loadChildren').mockResolvedValue();
      store = storeFactory(storeConfig);

      store.commit('channel/ADD_CHANNEL', CHANNEL);
      store.commit('contentNode/ADD_CONTENTNODE', TOPIC);
      store.commit('contentNode/ADD_CONTENTNODE', NODE_1);
      store.commit('contentNode/ADD_CONTENTNODE', NODE_2);

      wrapper = makeWrapper({ store });
    });

    afterEach(() => {
      resetJestGlobal();
      jest.resetAllMocks();
    });

    it('should display all nodes of a topic', () => {
      const nodeListItems = getNodeListItems(wrapper);

      expect(nodeListItems.length).toBe(2);
      expect(nodeListItems.at(0).text()).toContain('Test node 1');
      expect(nodeListItems.at(1).text()).toContain('Test node 2');
    });

    it("shouldn't display any nodes operations buttons when no nodes are selected", () => {
      expect(hasEditSelectedBtn(wrapper)).toBe(false);
      expect(hasCopySelectedToClipboardBtn(wrapper)).toBe(false);
      expect(hasMoveSelectedBtn(wrapper)).toBe(false);
      expect(hasDuplicateSelectedBtn(wrapper)).toBe(false);
      expect(hasDeleteSelectedBtn(wrapper)).toBe(false);
    });

    describe("when a user can't edit a channel", () => {
      it('should display only copy to clipboard button when some nodes are selected', () => {
        selectNode(wrapper, 0);

        expect(hasCopySelectedToClipboardBtn(wrapper)).toBe(true);
        expect(hasEditSelectedBtn(wrapper)).toBe(false);
        expect(hasMoveSelectedBtn(wrapper)).toBe(false);
        expect(hasDuplicateSelectedBtn(wrapper)).toBe(false);
        expect(hasDeleteSelectedBtn(wrapper)).toBe(false);
      });
    });

    describe('when a user can edit a channel', () => {
      beforeEach(() => {
        store.commit('channel/ADD_CHANNEL', { ...CHANNEL, edit: true });
      });

      it('should display all nodes operations buttons when some nodes are selected', () => {
        selectNode(wrapper, 0);

        expect(hasCopySelectedToClipboardBtn(wrapper)).toBe(true);
        expect(hasEditSelectedBtn(wrapper)).toBe(true);
        expect(hasMoveSelectedBtn(wrapper)).toBe(true);
        expect(hasDuplicateSelectedBtn(wrapper)).toBe(true);
        expect(hasDeleteSelectedBtn(wrapper)).toBe(true);
      });
    });
  });
});
