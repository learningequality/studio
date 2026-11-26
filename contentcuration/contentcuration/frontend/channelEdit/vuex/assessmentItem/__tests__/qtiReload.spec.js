import { nextTick } from 'vue';
import {
  cancelQtiReload,
  finishQtiLoad,
  isQtiItem,
  markQtiLoadStart,
  requestQtiReload,
  setQtiReloadBlocked,
} from '../qtiReload';
import storeFactory from 'shared/vuex/baseStore';
import { reloadBrowser } from 'shared/utils/navigation';

jest.mock('shared/utils/navigation', () => ({ reloadBrowser: jest.fn() }));

let store;

function request(ids = ['a'], start = markQtiLoadStart(ids)) {
  requestQtiReload({ rootState: store.state, rootGetters: store.getters }, ids, start);
  finishQtiLoad(start);
}

async function advance(ms = 2000) {
  await nextTick();
  jest.advanceTimersByTime(ms);
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick'] });
  sessionStorage.clear();
  store = storeFactory();
  store.commit('SET_UNSAVED_CHANGES', false);
  store.commit('SET_ONLINE_STATUS', true);
});

afterEach(() => {
  cancelQtiReload();
  setQtiReloadBlocked(false);
  reloadBrowser.mockClear();
  jest.useRealTimers();
});

it.each([
  [{ type: 'QTI' }, true],
  [{ type: 'single_selection', raw_data: '{}' }, true],
  [{ type: 'perseus_question', raw_data: '{}' }, false],
  [{ type: 'single_selection' }, false],
])('classifies %j', (item, expected) => {
  expect(isQtiItem(item)).toBe(expected);
});

it('holds for two seconds and limits reloads per tab', async () => {
  request();
  await advance(1999);
  expect(reloadBrowser).not.toHaveBeenCalled();
  await advance(1);
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem('qtiReloadedAt')).toBe(
    String(performance.timeOrigin + performance.now()),
  );
  request();
  await advance(59999);
  request();
  await advance(1);
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
  await advance();
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
  request();
  await advance();
  expect(reloadBrowser).toHaveBeenCalledTimes(2);
});

it('skips the first load when session storage contains a recent reload', async () => {
  sessionStorage.setItem('qtiReloadedAt', String(performance.timeOrigin + performance.now()));
  request();
  await advance(60000);
  expect(reloadBrowser).not.toHaveBeenCalled();
  request();
  await advance();
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
});

it('drops a queued reload when another page reloads in the same tab', async () => {
  setQtiReloadBlocked(true);
  request();
  setQtiReloadBlocked(false);
  await advance(1999);
  const lastReload = String(performance.timeOrigin + performance.now());
  sessionStorage.setItem('qtiReloadedAt', lastReload);
  await advance(1);
  expect(reloadBrowser).not.toHaveBeenCalled();
  expect(sessionStorage.getItem('qtiReloadedAt')).toBe(lastReload);
  await advance(60000);
  store.commit('SET_UNSAVED_CHANGES', true);
  store.commit('SET_UNSAVED_CHANGES', false);
  await advance();
  expect(reloadBrowser).not.toHaveBeenCalled();
});

it('restarts the hold after unsaved changes toggle within one tick', async () => {
  request();
  await advance(1999);
  store.commit('SET_UNSAVED_CHANGES', true);
  store.commit('SET_UNSAVED_CHANGES', false);
  await advance(1999);
  expect(reloadBrowser).not.toHaveBeenCalled();
  await advance(1);
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
});

it('uses elapsed time when the system clock changes', async () => {
  request();
  await advance();
  const wallTime = Date.now();
  jest.setSystemTime(wallTime + 3600000);
  request();
  await advance();
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
  jest.setSystemTime(wallTime - 3600000);
  await advance(58000);
  request();
  await advance();
  expect(reloadBrowser).toHaveBeenCalledTimes(2);
});

it('lets another tab reload during the first tab’s cooldown', async () => {
  request();
  await advance();
  const firstTabTimestamp = sessionStorage.getItem('qtiReloadedAt');
  const secondTabStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  const storage = jest.spyOn(window, 'sessionStorage', 'get').mockReturnValue(secondTabStorage);
  try {
    request();
    await advance();
    expect(secondTabStorage.setItem).toHaveBeenCalledWith(
      'qtiReloadedAt',
      String(performance.timeOrigin + performance.now()),
    );
    expect(reloadBrowser).toHaveBeenCalledTimes(2);
  } finally {
    storage.mockRestore();
  }
  expect(sessionStorage.getItem('qtiReloadedAt')).toBe(firstTabTimestamp);
});

it('waits indefinitely for saves and restarts an interrupted hold', async () => {
  store.commit('SET_UNSAVED_CHANGES', true);
  request();
  await advance(120000);
  expect(reloadBrowser).not.toHaveBeenCalled();
  store.commit('SET_UNSAVED_CHANGES', false);
  await advance(1000);
  store.commit('SET_UNSAVED_CHANGES', true);
  await advance(1);
  store.commit('SET_UNSAVED_CHANGES', false);
  await advance(1999);
  expect(reloadBrowser).not.toHaveBeenCalled();
  await advance(1);
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
});

it('cancels the timer immediately when changes become unsaved', async () => {
  request();
  await advance(1999);
  store.commit('SET_UNSAVED_CHANGES', true);
  jest.advanceTimersByTime(1);
  expect(reloadBrowser).not.toHaveBeenCalled();
});

it('waits for connection and uploads, including uploads that end in error', async () => {
  store.commit('SET_ONLINE_STATUS', false);
  request();
  await advance();
  expect(reloadBrowser).not.toHaveBeenCalled();
  store.commit('file/ADD_FILE', { id: 'file', loaded: 0, total: 10 });
  store.commit('SET_ONLINE_STATUS', true);
  await advance();
  expect(reloadBrowser).not.toHaveBeenCalled();
  store.commit('file/ADD_FILE', { id: 'file', error: 'failed' });
  await advance();
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
});

it('cancels waiting ids and invalidates older loads for those ids', async () => {
  const start = markQtiLoadStart();
  request();
  cancelQtiReload(['a']);
  request(['a'], start);
  await advance();
  expect(reloadBrowser).not.toHaveBeenCalled();
  request(['a', 'b']);
  cancelQtiReload(['b']);
  await advance();
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
});

it('cancels all waiting ids and invalidates all older loads', async () => {
  const start = markQtiLoadStart();
  request(['a', 'b']);
  cancelQtiReload();
  request(['c'], start);
  await advance();
  expect(reloadBrowser).not.toHaveBeenCalled();
});

it('an open question interrupts the hold for every waiting exercise', async () => {
  request(['a', 'b']);
  await advance(1000);
  setQtiReloadBlocked(true);
  await advance(120000);
  expect(reloadBrowser).not.toHaveBeenCalled();
  setQtiReloadBlocked(false);
  await advance(1999);
  expect(reloadBrowser).not.toHaveBeenCalled();
  await advance(1);
  expect(reloadBrowser).toHaveBeenCalledTimes(1);
});

it('ignores a denied cooldown read', async () => {
  const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Denied');
  });
  try {
    expect(request).not.toThrow();
    await advance();
    expect(reloadBrowser).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});

it('can request another reload after a failed cooldown write', async () => {
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new Error('Full');
  });
  try {
    request();
    await advance();
    expect(reloadBrowser).not.toHaveBeenCalled();
    request();
    await advance();
    expect(reloadBrowser).toHaveBeenCalledTimes(1);
  } finally {
    spy.mockRestore();
  }
});
