import { mount } from '@vue/test-utils';
import cloneDeep from 'lodash/cloneDeep';

import ProgressModal from '../ProgressModal';
import { STORE_CONFIG } from '../../../store';
import storeFactory from 'shared/vuex/baseStore';
import { resetJestGlobal } from 'shared/utils/testing';
import { TASK_ID } from 'shared/data/constants';

const CHANNEL_ID = 'test';

const PUBLISH_TASK = {
  task_id: 'task',
  task_name: 'export-channel',
  progress: 0,
  channel_id: CHANNEL_ID,
};
const SYNC_TASK = {
  task_id: 'task',
  task_name: 'sync-channel',
  progress: 0,
  channel_id: CHANNEL_ID,
};

function makeWrapper({ propsData, store, publishing = false } = {}) {
  return mount(ProgressModal, {
    propsData,
    store,
    computed: {
      currentChannel() {
        return {
          [TASK_ID]: 'task',
          id: CHANNEL_ID,
          last_published: new Date(),
          publishing,
        };
      },
    },
  });
}

function getProgress(wrapper) {
  return wrapper.find('[data-test="progress"]');
}

describe('ProgressModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
    resetJestGlobal();
  });

  it('smoke test', () => {
    const store = storeFactory(STORE_CONFIG);
    const wrapper = makeWrapper({ store });

    expect(wrapper.exists()).toBe(true);
  });

  describe('when publishing as a user with publish permissions', () => {
    let storeConfig;

    beforeEach(() => {
      storeConfig = cloneDeep(STORE_CONFIG);
      jest
        .spyOn(storeConfig.modules.currentChannel.getters, 'currentChannel')
        .mockReturnValue({ publishing: true });
      jest
        .spyOn(storeConfig.modules.currentChannel.getters, 'canManage')
        .mockReturnValue({ canManage: true });
    });

    describe('is in progress', () => {
      let wrapper;

      beforeEach(() => {
        const store = storeFactory(storeConfig);
        wrapper = makeWrapper({ store, publishing: true });
      });

      it('should display publishing message', () => {
        expect(wrapper.text()).toContain('Publishing channel');
      });

      it('should display progress', () => {
        expect(getProgress(wrapper).exists()).toBe(true);
      });
    });

    describe('errored out', () => {
      let wrapper;

      beforeEach(() => {
        const publishTask = cloneDeep(PUBLISH_TASK);
        publishTask.status = 'FAILURE';
        const store = storeFactory(storeConfig);
        store.commit('task/ADD_ASYNC_TASK', publishTask);
        wrapper = makeWrapper({ store });
      });

      it('should display an error message', () => {
        expect(wrapper.text()).toContain('Last attempt to publish failed');
      });

      it('should not display progress', () => {
        expect(getProgress(wrapper).exists()).toBe(false);
      });
    });

    describe('is complete', () => {
      let wrapper;

      beforeEach(() => {
        const publishTask = cloneDeep(PUBLISH_TASK);
        publishTask.progress = 100;
        const store = storeFactory(storeConfig);
        store.commit('task/ADD_ASYNC_TASK', publishTask);
        wrapper = makeWrapper({ store });
      });

      it('should display complete message', () => {
        expect(wrapper.text()).toContain('Published');
      });

      it("shouldn't display progress", () => {
        expect(getProgress(wrapper).exists()).toBe(false);
      });
    });
  });

  describe('when a user without publish permissions views a channel being published by another user', () => {
    it('progress should not be displayed', () => {
      const storeConfig = cloneDeep(STORE_CONFIG);
      const store = storeFactory(storeConfig);
      const wrapper = makeWrapper({ store });

      jest
        .spyOn(storeConfig.modules.currentChannel.getters, 'currentChannel')
        .mockReturnValue({ publishing: true });
      jest
        .spyOn(storeConfig.modules.currentChannel.getters, 'canManage')
        .mockReturnValue({ canManage: false });

      expect(getProgress(wrapper).exists()).toBe(false);
    });
  });

  describe('when syncing', () => {
    let propsData, storeConfig;

    beforeEach(() => {
      propsData = {
        syncing: true,
      };
      storeConfig = cloneDeep(STORE_CONFIG);
    });

    describe('is in progress', () => {
      let wrapper;

      beforeEach(() => {
        const syncTask = cloneDeep(SYNC_TASK);
        const store = storeFactory(storeConfig);
        store.commit('task/ADD_ASYNC_TASK', syncTask);
        wrapper = makeWrapper({ propsData, store });
      });

      it('should display syncing message', () => {
        expect(wrapper.text()).toContain('Syncing resources');
      });

      it('should display progress', () => {
        expect(getProgress(wrapper).exists()).toBe(true);
      });
    });

    describe('errored out', () => {
      let wrapper;

      beforeEach(() => {
        const syncTask = cloneDeep(SYNC_TASK);
        syncTask.status = 'FAILURE';
        const store = storeFactory(storeConfig);
        store.commit('task/ADD_ASYNC_TASK', syncTask);
        wrapper = makeWrapper({ propsData, store });
      });

      it('should not display progress', () => {
        expect(getProgress(wrapper).exists()).toBe(false);
      });

      it('should display error', () => {
        expect(wrapper.text()).toContain('Last attempt to sync failed');
      });
    });

    describe('is complete', () => {
      let wrapper;

      beforeEach(() => {
        const syncTask = cloneDeep(SYNC_TASK);
        syncTask.progress = 100;
        const store = storeFactory(storeConfig);
        store.commit('task/ADD_ASYNC_TASK', syncTask);
        wrapper = makeWrapper({ propsData, store });
      });

      it('should display progress', () => {
        expect(getProgress(wrapper).exists()).toBe(true);
      });
    });
  });
});
