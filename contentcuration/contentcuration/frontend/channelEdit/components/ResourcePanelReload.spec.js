import { shallowMount } from '@vue/test-utils';
import assessmentItem from '../vuex/assessmentItem';
import {
  cancelQtiReload,
  markQtiLoadStart,
  requestQtiReload,
  setQtiReloadBlocked,
} from '../vuex/assessmentItem/qtiReload';
import ResourcePanel from './ResourcePanel';
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
    {
      ...ResourcePanel,
      render: h => h('div'),
      methods: { ...ResourcePanel.methods, loadNode() {} },
      computed: {
        ...ResourcePanel.computed,
        node() {
          return { id: this.nodeId };
        },
      },
    },
    { store, propsData: { nodeId: 'exercise' } },
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

it.each(['switch', 'destroy'])('cancels a pending reload on %s', async close => {
  if (close === 'switch') {
    await wrapper.setProps({ nodeId: 'other' });
  } else {
    wrapper.destroy();
  }
  store.commit('SET_UNSAVED_CHANGES', false);
  jest.advanceTimersByTime(2000);
  expect(reloadBrowser).toHaveBeenCalledTimes(0);
});
