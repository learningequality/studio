import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import EditModal from '../../../components/edit/EditModal';
import { RouteNames } from '../../../constants';
import AssessmentTab from '../../../components/AssessmentTab/AssessmentTab';
import assessmentItem from '../index';
import { cancelQtiReload, setQtiReloadBlocked } from '../qtiReload';
import client from 'shared/client';
import { changeStream } from 'shared/data/applyRemoteChanges';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data/constants';
import { AssessmentItem } from 'shared/data/resources';
import { reloadBrowser } from 'shared/utils/navigation';
import { mockChannelScope, resetMockChannelScope } from 'shared/utils/testing';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('shared/utils/navigation', () => ({ reloadBrowser: jest.fn() }));

const legacy = {
  contentnode: 'exercise',
  assessment_id: 'question',
  type: 'single_selection',
  answers: '[]',
  hints: '[]',
};
const qti = { ...legacy, type: 'QTI' };
const params = { contentnode__in: [legacy.contentnode] };

let store;
let get;
let resolveResponse;

function load() {
  return store.dispatch('assessmentItem/loadAssessmentItems', params);
}

function expectReload(expected) {
  jest.useFakeTimers({ doNotFake: ['nextTick'] });
  store.commit('SET_UNSAVED_CHANGES', false);
  setQtiReloadBlocked(false);
  jest.advanceTimersByTime(2000);
  expect(reloadBrowser).toHaveBeenCalledTimes(expected);
}

beforeEach(async () => {
  await mockChannelScope('test-channel');
  AssessmentItem._requests = {};
  jest
    .spyOn(AssessmentItem, 'fetchCollection')
    .mockImplementation(Object.getPrototypeOf(AssessmentItem).fetchCollection);
  sessionStorage.clear();
  setQtiReloadBlocked(true);
  store = storeFactory({
    getters: { appendChannelName: () => title => title },
    modules: {
      assessmentItem: { ...assessmentItem },
      currentChannel: { namespaced: true, getters: { canEdit: () => true } },
      contentNode: {
        namespaced: true,
        getters: {
          getContentNode: () => () => ({ learning_activities: {}, complete: false }),
          getContentNodeIsValid: () => () => true,
        },
        actions: {
          loadContentNodes: jest.fn(),
          loadRelatedResources: jest.fn(),
          updateContentNode: jest.fn(),
        },
        mutations: { ENABLE_VALIDATION_ON_NODES: jest.fn() },
      },
    },
  });
  store.commit('SET_UNSAVED_CHANGES', true);
  store.commit('SET_ONLINE_STATUS', true);
  get = jest.fn(
    () =>
      new Promise(resolve => {
        resolveResponse = items => resolve({ data: items });
      }),
  );
  jest.spyOn(client, 'get').mockImplementation((url, options) => {
    return url === AssessmentItem.collectionUrl()
      ? get(url, options)
      : Promise.resolve({ data: [] });
  });
});

afterEach(async () => {
  cancelQtiReload();
  jest.useRealTimers();
  reloadBrowser.mockClear();
  jest.restoreAllMocks();
  await AssessmentItem.table.clear();
  await resetMockChannelScope();
});

it.each([
  [qti, 1],
  [{ ...legacy, raw_data: '{}' }, 1],
  [{ ...legacy, type: 'perseus_question', raw_data: '{}' }, 0],
  [legacy, 0],
])('loads and commits server item %j', async (item, expected) => {
  get.mockResolvedValue({ data: [item] });
  await load();
  expect(store.getters['assessmentItem/getAssessmentItems'](legacy.contentnode)).toMatchObject([
    { type: item.type },
  ]);
  expectReload(expected);
});

it.each([
  [legacy, qti],
  [qti, legacy],
])(
  'checks cached rows and the background response via one request (%j)',
  async (cached, remote) => {
    await AssessmentItem.table.put(cached);
    expect(await load()).toMatchObject([{ type: cached.type }]);
    expect(get).toHaveBeenCalledTimes(1);
    const refresh = AssessmentItem.fetchCollection.mock.results[0].value;
    resolveResponse([remote]);
    await refresh;
    await new Promise(resolve => process.nextTick(resolve));
    expect(get).toHaveBeenCalledTimes(1);
    expect(store.getters['assessmentItem/getAssessmentItems'](legacy.contentnode)).toMatchObject([
      { type: cached.type },
    ]);
    expectReload(1);
  },
);

it('keeps cached rows when a refresh fails', async () => {
  await AssessmentItem.table.put(legacy);
  get.mockRejectedValue(new Error('offline'));
  expect(await load()).toMatchObject([{ type: legacy.type }]);
  await expect(AssessmentItem.fetchCollection.mock.results[0].value).rejects.toThrow('offline');
  await new Promise(resolve => process.nextTick(resolve));
  expectReload(0);
});

it('ignores a pending load after cancellation and checks the next load', async () => {
  let started;
  const requestStarted = new Promise(resolve => {
    started = resolve;
  });
  get.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveResponse = items => resolve({ data: items });
        started();
      }),
  );
  const pending = load();
  await requestStarted;
  await store.dispatch('assessmentItem/cancelQtiReload', [qti.contentnode]);
  resolveResponse([qti]);
  await pending;
  expectReload(0);
  jest.useRealTimers();
  setQtiReloadBlocked(true);
  store.commit('SET_UNSAVED_CHANGES', true);
  await load();
  await new Promise(resolve => process.nextTick(resolve));
  expectReload(1);
});

it.each([[qti], [{ ...legacy, type: 'perseus_question', raw_data: '{}' }]])(
  'locks a returned create without requesting a reload (%j)',
  async item => {
    const editor = mount(AssessmentTab, {
      store,
      propsData: { nodeId: item.contentnode },
      stubs: { AssessmentItemEditor: true },
    });
    try {
      expect(editor.find('[data-test="item"]').exists()).toBe(false);
      const committed = new Promise(resolve => {
        const unsubscribe = store.subscribe(({ type }) => {
          if (type === 'assessmentItem/UPDATE_ASSESSMENTITEM') {
            unsubscribe();
            resolve();
          }
        });
      });
      await changeStream.write([
        {
          table: TABLE_NAMES.ASSESSMENTITEM,
          type: CHANGE_TYPES.CREATED,
          key: [item.contentnode, item.assessment_id],
          obj: item,
        },
      ]);
      await committed;
      const row = editor.find('[data-test="item"]');
      expect(row.exists()).toBe(true);
      await row.trigger('click');
      expect(editor.find('[data-test="editor"]').exists()).toBe(false);
      expectReload(0);
    } finally {
      editor.destroy();
    }
  },
);

it.each([
  [legacy, 0],
  [qti, 1],
])('uses cached rows with a pending refresh (%j)', async (item, expected) => {
  await AssessmentItem.table.put(item);
  expect(await load()).toMatchObject([{ type: item.type }]);
  expect(get).toHaveBeenCalledTimes(1);
  expectReload(expected);
});

it('opens the persisted new question beside a returned QTI create and closes it on exercise switch', async () => {
  const tab = mount(AssessmentTab, {
    store,
    propsData: { nodeId: legacy.contentnode },
    stubs: {
      AssessmentItemEditor: {
        name: 'AssessmentItemEditor',
        props: ['item'],
        render: h => h('div'),
      },
    },
  });
  try {
    const created = new Promise(resolve => {
      const unsubscribe = store.subscribe(({ type, payload }) => {
        if (type === 'assessmentItem/UPDATE_ASSESSMENTITEM' && payload.type !== 'QTI') {
          unsubscribe();
          resolve(payload);
        }
      });
    });
    const locked = { ...qti, order: 0 };
    await tab.find('[data-test="newQuestionBtn"]').trigger('click');
    store.commit('assessmentItem/UPDATE_ASSESSMENTITEM', locked);
    const saved = await created;
    expect(await AssessmentItem.table.get([saved.contentnode, saved.assessment_id])).toBeDefined();
    const editors = tab.findAllComponents({ name: 'AssessmentItemEditor' });
    expect(editors).toHaveLength(1);
    expect(editors.at(0).props('item').assessment_id).toBe(saved.assessment_id);

    store.commit('assessmentItem/UPDATE_ASSESSMENTITEM', {
      ...saved,
      contentnode: 'other',
    });
    await tab.setProps({ nodeId: 'other' });
    expect(tab.find('[data-test="editor"]').exists()).toBe(false);
  } finally {
    tab.destroy();
  }
});

it.each(['Finish', 'Back'])('cancels a server-triggered reload when leaving via %s', async exit => {
  get.mockResolvedValue({ data: [qti] });
  const tree = { render: h => h('div') };
  const router = new VueRouter({
    mode: 'abstract',
    routes: [
      { path: '/tree/:nodeId', name: RouteNames.TREE_VIEW, component: tree },
      {
        path: '/tree/:nodeId/edit/:detailNodeIds',
        name: RouteNames.CONTENTNODE_DETAILS,
        component: EditModal,
        props: true,
      },
    ],
  });
  await router.push('/tree/parent');
  const slot = {
    render(h) {
      return h('div', this.$slots.default);
    },
  };
  const root = mount(
    { render: h => h('router-view') },
    {
      store,
      router,
      stubs: {
        VDialog: slot,
        BottomBar: slot,
        Uploader: {
          render(h) {
            return h('div', this.$scopedSlots.default({}));
          },
        },
        EditView: {
          methods: { immediateSaveAll: () => Promise.resolve(false) },
          render: h => h('div'),
        },
        InheritAncestorMetadataModal: true,
        FileStorage: true,
        SavingIndicator: true,
      },
    },
  );
  const html = document.documentElement;
  const originalStyle = html.style.cssText;
  const clearStoragePoll = jest.spyOn(window, 'clearInterval');
  const navigation = jest.spyOn(console, 'error').mockImplementation(() => {});
  reloadBrowser.mockImplementation(jest.requireActual('shared/utils/navigation').reloadBrowser);
  try {
    setQtiReloadBlocked(false);
    await router.push('/tree/parent/edit/exercise');
    const modal = root.findComponent(EditModal);
    const loaded = new Promise(resolve => {
      const unwatch = modal.vm.$watch('loading', loading => {
        if (!loading) {
          unwatch();
          resolve();
        }
      });
    });
    await loaded;
    expect(modal.vm.loadError).toBe(false);
    expect(store.getters['assessmentItem/getAssessmentItems']('exercise')[0].type).toBe('QTI');
    expect(html).toHaveStyle({ overflowY: 'hidden' });

    const storagePoll = modal.vm.storagePoll;
    if (exit === 'Finish') {
      const finish = modal.findAll('button').wrappers.find(button => button.text() === 'Finish');
      await finish.trigger('click');
    } else {
      router.back();
    }
    await new Promise(resolve => process.nextTick(resolve));
    expect(router.currentRoute.name).toBe(RouteNames.TREE_VIEW);
    expect(modal.vm._isDestroyed).toBe(true);
    expect(clearStoragePoll).toHaveBeenCalledWith(storagePoll);
    expect(html).toHaveStyle({ overflowY: 'auto' });

    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    store.commit('SET_UNSAVED_CHANGES', false);
    jest.advanceTimersByTime(2000);
    expect(reloadBrowser).not.toHaveBeenCalled();
    const navigationAttempts = () =>
      navigation.mock.calls.filter(([error]) => String(error).includes('navigation'));
    expect(navigationAttempts()).toHaveLength(0);

    jest.useRealTimers();
    store.commit('SET_UNSAVED_CHANGES', true);
    await load();
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    store.commit('SET_UNSAVED_CHANGES', false);
    jest.advanceTimersByTime(2000);
    expect(navigationAttempts()).toHaveLength(1);
  } finally {
    root.destroy();
    html.style.cssText = originalStyle;
    reloadBrowser.mockReset();
  }
});
