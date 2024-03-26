import { liveQuery } from 'dexie';
import syncProgressModule from './syncProgressModule';
import db from 'shared/data/db';
import { CHANGES_TABLE } from 'shared/data/constants';

const SyncProgressPlugin = store => {
  store.registerModule('syncProgress', syncProgressModule);

  store.listenForIndexedDBChanges = () => {
    const observable = liveQuery(() => {
      return db[CHANGES_TABLE].toCollection()
        .filter(c => !c.synced)
        .first(Boolean);
    });

    const subscription = observable.subscribe({
      next(result) {
        store.commit('SET_UNSAVED_CHANGES', result);
      },
      error() {
        subscription.unsubscribe();
      },
    });
    store.stopListeningForIndexedDBChanges = subscription.unsubscribe;
  };
};

export default SyncProgressPlugin;
