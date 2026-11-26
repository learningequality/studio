import { shallowMount } from '@vue/test-utils';
import contentNode from '../../vuex/contentNode';
import assessmentItem from '../../vuex/assessmentItem';
import {
  cancelQtiReload,
  markQtiLoadStart,
  requestQtiReload,
  setQtiReloadBlocked,
} from '../../vuex/assessmentItem/qtiReload';
import AssessmentTab from './AssessmentTab';
import { reloadBrowser } from 'shared/utils/navigation';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('shared/utils/navigation', () => ({ reloadBrowser: jest.fn() }));

let wrapper;
let store;

beforeEach(() => {
  sessionStorage.clear();
  jest.useFakeTimers({ doNotFake: ['nextTick'] });
  store = storeFactory({ modules: { assessmentItem, contentNode } });
  store.commit('SET_UNSAVED_CHANGES', true);
  store.commit('SET_ONLINE_STATUS', true);
  wrapper = shallowMount(AssessmentTab, { store, propsData: { nodeId: 'other' } });
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

it.each(['close', 'destroy'])('holds the reload until question %s', end => {
  const editor = wrapper.findComponent({ name: 'AssessmentEditor' });
  editor.vm.$emit('questionOpen', true);
  store.commit('SET_UNSAVED_CHANGES', false);
  jest.advanceTimersByTime(2000);
  expect(reloadBrowser).not.toHaveBeenCalled();
  if (end === 'destroy') {
    wrapper.destroy();
  } else {
    editor.vm.$emit('questionOpen', false);
  }
  jest.advanceTimersByTime(2000);
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
});
