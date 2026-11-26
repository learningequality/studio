import { shallowMount } from '@vue/test-utils';
import assessmentItem from '../../vuex/assessmentItem';
import {
  cancelQtiReload,
  markQtiLoadStart,
  requestQtiReload,
  setQtiReloadBlocked,
} from '../../vuex/assessmentItem/qtiReload';
import EditModal from './EditModal';
import { reloadBrowser } from 'shared/utils/navigation';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('shared/utils/navigation', () => ({ reloadBrowser: jest.fn() }));

let wrapper;
let store;

beforeEach(() => {
  sessionStorage.clear();
  jest.useFakeTimers({ doNotFake: ['nextTick'] });
  store = storeFactory({ modules: { assessmentItem } });
  store.commit('SET_UNSAVED_CHANGES', true);
  store.commit('SET_ONLINE_STATUS', true);
  wrapper = shallowMount(
    { ...EditModal, render: h => h('div'), mounted() {} },
    { store, propsData: { detailNodeIds: 'other' } },
  );
  requestQtiReload(
    { rootState: store.state, rootGetters: store.getters },
    ['exercise'],
    markQtiLoadStart(),
  );
});

afterEach(() => {
  if (wrapper && !wrapper.vm._isDestroyed) {
    wrapper.destroy();
  }
  cancelQtiReload();
  setQtiReloadBlocked(false);
  jest.useRealTimers();
  reloadBrowser.mockClear();
});

it('cancels a pending reload', () => {
  wrapper.destroy();
  store.commit('SET_UNSAVED_CHANGES', false);
  jest.advanceTimersByTime(2000);
  expect(reloadBrowser).toHaveBeenCalledTimes(0);
});

it('cancels a pending reload before close navigation completes', () => {
  const navigateBack = jest.fn(() => new Promise(() => {}));
  EditModal.methods.closeModal.call({ uploadMode: true, cancelQtiReload, navigateBack });
  expect(navigateBack).toHaveBeenCalled();
  store.commit('SET_UNSAVED_CHANGES', false);
  jest.advanceTimersByTime(2000);
  expect(reloadBrowser).not.toHaveBeenCalled();
});

it('cancels a pending reload when its exercise leaves the route', async () => {
  await wrapper.setProps({ detailNodeIds: 'exercise,other' });
  await wrapper.setProps({ detailNodeIds: 'other' });
  store.commit('SET_UNSAVED_CHANGES', false);
  jest.advanceTimersByTime(2000);
  expect(reloadBrowser).not.toHaveBeenCalled();
});
