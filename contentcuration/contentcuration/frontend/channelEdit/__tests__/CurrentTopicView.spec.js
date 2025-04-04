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
    stubs: {
      NodePanel: true,
    },
  });
};

function hasEditSelectedBtn(wrapper) {
  return wrapper.findComponent('[data-test="edit-selected-btn"]').exists();
}

function hasCopySelectedToClipboardBtn(wrapper) {
  return wrapper.findComponent('[data-test="copy-selected-to-clipboard-btn"]').exists();
}

function hasMoveSelectedBtn(wrapper) {
  return wrapper.findComponent('[data-test="move-selected-btn"]').exists();
}

function hasDuplicateSelectedBtn(wrapper) {
  return wrapper.findComponent('[data-test="duplicate-selected-btn"]').exists();
}

function hasDeleteSelectedBtn(wrapper) {
  return wrapper.findComponent('[data-test="delete-selected-btn"]').exists();
}

async function selectNode(wrapper) {
  wrapper.vm.$store.commit('currentChannel/SET_SELECTED_NODE_IDS', [NODE_1.id]);
  await wrapper.vm.$nextTick();
}

describe('CurrentTopicView', () => {
  let wrapper;

  afterEach(() => {
    wrapper && wrapper.destroy();
  });

  it('smoke test', () => {
    const store = storeFactory(STORE_CONFIG);
    wrapper = makeWrapper({ store });

    expect(wrapper.exists()).toBe(true);
  });

  describe('for a topic with nodes', () => {
    let store;

    beforeEach(() => {
      global.CHANNEL_EDIT_GLOBAL.channel_id = CHANNEL.id;

      const storeConfig = cloneDeep(STORE_CONFIG);
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

    it("shouldn't display any nodes operations buttons when no nodes are selected", () => {
      expect(hasEditSelectedBtn(wrapper)).toBe(false);
      expect(hasCopySelectedToClipboardBtn(wrapper)).toBe(false);
      expect(hasMoveSelectedBtn(wrapper)).toBe(false);
      expect(hasDuplicateSelectedBtn(wrapper)).toBe(false);
      expect(hasDeleteSelectedBtn(wrapper)).toBe(false);
    });

    describe("when a user can't edit a channel", () => {
      it('should display only copy to clipboard button when some nodes are selected', async () => {
        await selectNode(wrapper);

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

      it('should display all nodes operations buttons when some nodes are selected', async () => {
        await selectNode(wrapper);

        expect(hasCopySelectedToClipboardBtn(wrapper)).toBe(true);
        expect(hasEditSelectedBtn(wrapper)).toBe(true);
        expect(hasMoveSelectedBtn(wrapper)).toBe(true);
        expect(hasDuplicateSelectedBtn(wrapper)).toBe(true);
        expect(hasDeleteSelectedBtn(wrapper)).toBe(true);
      });
    });
  });
});
