import Vue from 'vue';
import { AssessmentItemTypes } from 'shared/constants';
import { reloadBrowser } from 'shared/utils/navigation';

const reloadKey = 'qtiReloadedAt';
const waitingIds = new Set();
const pendingLoads = new Set();
const state = Vue.observable({ blocked: false });
let watcher;
let holdTimer;

export function isQtiItem(item) {
  return (
    item.type === AssessmentItemTypes.QTI ||
    (Boolean(item.raw_data) && item.type !== AssessmentItemTypes.PERSEUS_QUESTION)
  );
}

export function markQtiLoadStart(nodeIds) {
  const load = { nodeIds, cancelledIds: new Set() };
  pendingLoads.add(load);
  return load;
}

export function finishQtiLoad(load) {
  pendingLoads.delete(load);
}

function stopWatching() {
  clearTimeout(holdTimer);
  if (watcher) {
    watcher.$destroy();
    watcher = null;
  }
}

function isReloadOnCooldown(now = performance.timeOrigin + performance.now()) {
  const lastReload = window.sessionStorage.getItem(reloadKey);
  return lastReload !== null && now - Number(lastReload) < 60000;
}

export function requestQtiReload({ rootGetters, rootState }, nodeIds, loadStart) {
  if (!pendingLoads.has(loadStart)) {
    return;
  }

  try {
    if (isReloadOnCooldown()) {
      return;
    }
  } catch {
    cancelQtiReload();
    return;
  }

  for (const id of nodeIds) {
    if (!loadStart.cancelledIds.has(id)) {
      waitingIds.add(id);
    }
  }
  if (watcher || !waitingIds.size) {
    return;
  }

  const ready = () =>
    !state.blocked &&
    rootState.connection.online &&
    rootGetters.areAllChangesSaved &&
    !rootGetters['file/filesAreUploading'];

  watcher = new Vue();
  watcher.$watch(
    ready,
    canReload => {
      clearTimeout(holdTimer);
      if (canReload) {
        holdTimer = setTimeout(() => {
          waitingIds.clear();
          stopWatching();
          try {
            const now = performance.timeOrigin + performance.now();
            if (isReloadOnCooldown(now)) {
              return;
            }
            window.sessionStorage.setItem(reloadKey, String(now));
          } catch {
            return;
          }
          reloadBrowser();
        }, 2000);
      }
    },
    { immediate: true, sync: true },
  );
}

export function cancelQtiReload(nodeIds) {
  if (nodeIds) {
    for (const id of nodeIds) {
      waitingIds.delete(id);
    }
    for (const load of pendingLoads) {
      for (const id of nodeIds) {
        if (!load.nodeIds || load.nodeIds.includes(id)) {
          load.cancelledIds.add(id);
        }
      }
      if (load.nodeIds?.every(id => load.cancelledIds.has(id))) {
        pendingLoads.delete(load);
      }
    }
  } else {
    pendingLoads.clear();
    waitingIds.clear();
  }
  if (!waitingIds.size) {
    stopWatching();
  }
}

export function setQtiReloadBlocked(blocked) {
  state.blocked = blocked;
}
