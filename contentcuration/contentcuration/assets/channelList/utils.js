import omit from 'lodash/omit';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import store from './store';

const DIRTY_KEY = '_lastSaved';

export function setDirtyTracking(object) {
  // Store a record of previous attributes here for dirty checking.
  object[DIRTY_KEY] = cloneDeep(omit(object, DIRTY_KEY));
}

export function isDirty(object) {
  return !isEqual(omit(object, DIRTY_KEY), object[DIRTY_KEY]);
}

export function getDirtyDiff(object, idKey = 'id') {
  // Get top level keys that are different between
  // the last saved state and the current state
  const diff = {};
  Object.entries(object).forEach(([key, value]) => {
    if (key !== DIRTY_KEY) {
      if (!isEqual(value, object[DIRTY_KEY][key]) || isDummyId(object[idKey])) {
        diff[key] = value;
      }
    }
  });
  return diff;
}

const DUMMY_ID_KEY = '____dummyId:';

export function generateDummyId() {
  return `${DUMMY_ID_KEY}${String(Math.random()).slice(2)}`;
}

export function isDummyId(id) {
  return id.startsWith(DUMMY_ID_KEY);
}
