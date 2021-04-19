import { mount } from '@vue/test-utils';
import cloneDeep from 'lodash/cloneDeep';

import ProgressModal from '../ProgressModal';
import { STORE_CONFIG } from '../../../store';
import storeFactory from 'shared/vuex/baseStore';
import { resetJestGlobal } from 'shared/utils/testing';

const PUBLISH_TASK = {
  id: 'id-publish-task',
  task_type: 'export-channel',
  metadata: { progress: 0 },
};
const SYNC_TASK = { id: 'id-sync-task', task_type: 'sync-channel', metadata: { progress: 0 } };

function makeWrapper({ propsData, store }) {
  return mount(ProgressModal, {
    propsData,
    store,
  });
}

function getProgressModal(wrapper) {
  return wrapper.find('[data-test="progress-modal"]');
}

function getCancelModal(wrapper) {
  return wrapper.find('[data-test="cancel-modal"]');
}

function getProgressBar(wrapper) {
  return wrapper.find('[data-test="progress-bar"]');
}

function getStopButton(wrapper) {
  return wrapper.find('[data-test="stop-button"]');
}

function getCancelStopButton(wrapper) {
  return wrapper.find('[data-test="cancel-modal"]').find('[name="cancel"]');
}

function getRefreshButton(wrapper) {
  return wrapper.find('[data-test="refresh-button"]');
}

describe('ProgressModal', () => {
  let pageReload;

  beforeEach(() => {
    pageReload = jest.fn();
    global.location.reload = pageReload;
  });

  afterEach(() => {
    jest.resetAllMocks();
    resetJestGlobal();
  });

  it('smoke test', () => {
    const store = storeFactory(STORE_CONFIG);
    const wrapper = makeWrapper({ store });

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('should be hidden if the user is not syncing or publishing', () => {
    const propsData = {
      syncing: false,
    };
    const storeConfig = cloneDeep(STORE_CONFIG);
    jest
      .spyOn(storeConfig.modules.currentChannel.getters, 'currentChannel')
      .mockReturnValue({ publishing: false });
    const store = storeFactory(storeConfig);
    const wrapper = makeWrapper({ propsData, store });

    expect(getProgressModal(wrapper).exists()).toBe(false);
    expect(getCancelModal(wrapper).exists()).toBe(false);
  });

  describe('when publishing as a user with publish permissions', () => {
    let storeConfig, stopTask;

    beforeEach(() => {
      storeConfig = cloneDeep(STORE_CONFIG);
      jest
        .spyOn(storeConfig.modules.currentChannel.getters, 'currentChannel')
        .mockReturnValue({ publishing: true });
      jest
        .spyOn(storeConfig.modules.currentChannel.getters, 'canManage')
        .mockReturnValue({ canManage: true });
      stopTask = jest
        .spyOn(storeConfig.modules.currentChannel.actions, 'stopTask')
        .mockResolvedValue();
    });

    it('progress modal should be displayed', () => {
      const store = storeFactory(storeConfig);
      const wrapper = makeWrapper({ store });

      expect(getProgressModal(wrapper).exists()).toBe(true);
      expect(getCancelModal(wrapper).exists()).toBe(false);
    });

    describe('is in progress', () => {
      let wrapper;

      beforeEach(() => {
        const store = storeFactory(storeConfig);
        wrapper = makeWrapper({ store });
      });

      it('should display publishing message', () => {
        expect(getProgressModal(wrapper).text()).toContain(
          'Once publishing is complete, you will receive an email notification and will be able to make further edits to your channel.'
        );
      });

      it('should display progress bar', () => {
        expect(getProgressBar(wrapper).exists()).toBe(true);
      });

      it("shouldn't display refresh button", () => {
        expect(getRefreshButton(wrapper).exists()).toBe(false);
      });

      it('should display stop button', () => {
        expect(getStopButton(wrapper).exists()).toBe(true);
      });

      it('clicking stop button should switch to cancel modal', () => {
        getStopButton(wrapper).trigger('click');

        expect(getCancelModal(wrapper).exists()).toBe(true);
        expect(getProgressModal(wrapper).exists()).toBe(false);
      });

      it('cancelling the cancel modal should go back to progress modal', () => {
        getStopButton(wrapper).trigger('click');
        expect(getCancelModal(wrapper).exists()).toBe(true);

        getCancelStopButton(wrapper).trigger('click');
        expect(getCancelModal(wrapper).exists()).toBe(false);
        expect(getProgressModal(wrapper).exists()).toBe(true);
      });

      it('confirmation of the cancel modal should stop publishing and reload the page', async () => {
        // open the cancel modal
        getStopButton(wrapper).trigger('click');
        // confirm stop publishing
        getCancelModal(wrapper)
          .find('form')
          .trigger('submit');

        expect(stopTask).toHaveBeenCalledTimes(1);
        await wrapper.vm.$nextTick();
        expect(pageReload).toHaveBeenCalledTimes(1);
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
        expect(wrapper.text()).toContain('An unexpected error has occurred');
      });

      it('should display progress bar', () => {
        expect(getProgressBar(wrapper).exists()).toBe(true);
      });

      it("shouldn't display stop button", () => {
        expect(getStopButton(wrapper).exists()).toBe(false);
      });

      it('should display refresh button', () => {
        expect(getRefreshButton(wrapper).exists()).toBe(true);
      });

      it('clicking on refresh button should stop publishing and reload the page', async () => {
        getRefreshButton(wrapper).trigger('click');

        expect(stopTask).toHaveBeenCalledTimes(1);
        await wrapper.vm.$nextTick();
        expect(pageReload).toHaveBeenCalledTimes(1);
      });
    });

    describe('is complete', () => {
      let wrapper;

      beforeEach(() => {
        const publishTask = cloneDeep(PUBLISH_TASK);
        publishTask.metadata.progress = 100;
        const store = storeFactory(storeConfig);
        store.commit('task/ADD_ASYNC_TASK', publishTask);
        wrapper = makeWrapper({ store });
      });

      it('should display complete message', () => {
        expect(getProgressModal(wrapper).text()).toContain(
          'Once publishing is complete, you will receive an email notification and will be able to make further edits to your channel.'
        );
      });

      it("shouldn't display progress bar", () => {
        expect(getProgressBar(wrapper).exists()).toBe(false);
      });

      it("shouldn't display stop button", () => {
        expect(getStopButton(wrapper).exists()).toBe(false);
      });

      it('should display refresh button', () => {
        expect(getRefreshButton(wrapper).exists()).toBe(true);
      });

      it('clicking on refresh button should stop publishing and reload the page', async () => {
        getRefreshButton(wrapper).trigger('click');

        expect(stopTask).toHaveBeenCalledTimes(1);
        await wrapper.vm.$nextTick();
        expect(pageReload).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when a user without publish permissions is viewing a channel currently being published by another user', () => {
    it('progress modal should not be displayed', () => {

      const storeConfig = cloneDeep(STORE_CONFIG);
      const store = storeFactory(storeConfig);
      const wrapper = makeWrapper({ store });

      jest
        .spyOn(storeConfig.modules.currentChannel.getters, 'currentChannel')
        .mockReturnValue({ publishing: true });
      jest
        .spyOn(storeConfig.modules.currentChannel.getters, 'canManage')
        .mockReturnValue({ canManage: false });

      expect(getProgressModal(wrapper).exists()).toBe(false);
      expect(getCancelModal(wrapper).exists()).toBe(false);
    });
  });

  describe('when syncing', () => {
    let propsData, storeConfig, stopTask;

    beforeEach(() => {
      propsData = {
        syncing: true,
      };
      storeConfig = cloneDeep(STORE_CONFIG);
      jest
        .spyOn(storeConfig.modules.currentChannel.getters, 'currentChannel')
        .mockReturnValue({ publishing: false });
      stopTask = jest
        .spyOn(storeConfig.modules.currentChannel.actions, 'stopTask')
        .mockResolvedValue();
    });

    it('progress modal should be displayed', () => {
      const store = storeFactory(storeConfig);
      const wrapper = makeWrapper({ propsData, store });

      expect(getProgressModal(wrapper).exists()).toBe(true);
      expect(getCancelModal(wrapper).exists()).toBe(false);
    });

    describe('is in progress', () => {
      let wrapper;

      beforeEach(() => {
        const store = storeFactory(storeConfig);
        wrapper = makeWrapper({ propsData, store });
      });

      it('should display syncing message', () => {
        expect(getProgressModal(wrapper).text()).toContain(
          'Channel syncing is in progress, please wait...'
        );
      });

      it('should display progress bar', () => {
        expect(getProgressBar(wrapper).exists()).toBe(true);
      });

      it("shouldn't display refresh button", () => {
        expect(getRefreshButton(wrapper).exists()).toBe(false);
      });

      it('should display stop button', () => {
        expect(getStopButton(wrapper).exists()).toBe(true);
      });

      it('clicking stop button should switch to cancel modal', () => {
        getStopButton(wrapper).trigger('click');

        expect(getCancelModal(wrapper).exists()).toBe(true);
        expect(getProgressModal(wrapper).exists()).toBe(false);
      });

      it('cancelling the cancel modal should go back to progress modal', () => {
        getStopButton(wrapper).trigger('click');
        expect(getCancelModal(wrapper).exists()).toBe(true);

        getCancelStopButton(wrapper).trigger('click');
        expect(getCancelModal(wrapper).exists()).toBe(false);
        expect(getProgressModal(wrapper).exists()).toBe(true);
      });

      it('confirmation of the cancel modal should stop syncing and reload the page', async () => {
        // open the cancel modal
        getStopButton(wrapper).trigger('click');
        // confirm stop publishing
        getCancelModal(wrapper)
          .find('form')
          .trigger('submit');

        expect(stopTask).toHaveBeenCalledTimes(1);
        await wrapper.vm.$nextTick();
        expect(pageReload).toHaveBeenCalledTimes(1);
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

      it('should display an error message', () => {
        expect(wrapper.text()).toContain('An unexpected error has occurred');
      });

      it('should display progress bar', () => {
        expect(getProgressBar(wrapper).exists()).toBe(true);
      });

      it("shouldn't display stop button", () => {
        expect(getStopButton(wrapper).exists()).toBe(false);
      });

      it('should display refresh button', () => {
        expect(getRefreshButton(wrapper).exists()).toBe(true);
      });

      it('clicking on refresh button should stop syncing and reload the page', async () => {
        getRefreshButton(wrapper).trigger('click');

        expect(stopTask).toHaveBeenCalledTimes(1);
        await wrapper.vm.$nextTick();
        expect(pageReload).toHaveBeenCalledTimes(1);
      });
    });

    describe('is complete', () => {
      let wrapper;

      beforeEach(() => {
        const syncTask = cloneDeep(SYNC_TASK);
        syncTask.metadata.progress = 100;
        const store = storeFactory(storeConfig);
        store.commit('task/ADD_ASYNC_TASK', syncTask);
        wrapper = makeWrapper({ propsData, store });
      });

      it('should display complete message', () => {
        expect(getProgressModal(wrapper).text()).toContain(
          'Operation complete! Click "Refresh" to update the page.'
        );
      });

      it("shouldn't display progress bar", () => {
        expect(getProgressBar(wrapper).exists()).toBe(false);
      });

      it("shouldn't display stop button", () => {
        expect(getStopButton(wrapper).exists()).toBe(false);
      });

      it('should display refresh button', () => {
        expect(getRefreshButton(wrapper).exists()).toBe(true);
      });

      it('clicking on refresh button should stop syncing and reload the page', async () => {
        getRefreshButton(wrapper).trigger('click');

        expect(stopTask).toHaveBeenCalledTimes(1);
        await wrapper.vm.$nextTick();
        expect(pageReload).toHaveBeenCalledTimes(1);
      });
    });
  });
});
