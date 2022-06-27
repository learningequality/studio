import syncProgressModule from './syncProgressModule';
import db from 'shared/data/db';
import { CHANGES_TABLE } from 'shared/data/constants';

const SyncProgressPlugin = store => {
  store.registerModule('syncProgress', syncProgressModule);

  db.on('changes', function(changes) {
    const changesTableUpdated = changes.some(change => change.table === CHANGES_TABLE);
    if (!changesTableUpdated) {
      return;
    }

    db[CHANGES_TABLE].toCollection()
      .filter(c => !c.synced)
      .limit(1)
      .count()
      .then(count => store.commit('SET_UNSAVED_CHANGES', count > 0));
  });
};

export default SyncProgressPlugin;
