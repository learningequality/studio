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
      .filter(c => !c.errors)
      .count()
      .then(unsavedChangesCount => store.commit('SET_UNSAVED_CHANGES', unsavedChangesCount > 0));
  });
};

export default SyncProgressPlugin;
