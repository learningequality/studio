import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';

export function lastSavedStateFactory(idKey = 'id') {
  // Return an object with methods to track the last saved state
  const lastSavedStore = {};
  return {
    storeLastSavedState(object) {
      // Store a record of previous attributes here for dirty checking.
      lastSavedStore[object[idKey]] = cloneDeep(object);
    },
    hasUnsavedChanges(object) {
      return !isEqual(object, lastSavedStore[object[idKey]]);
    },
    getUnsavedChanges(object) {
      // Get top level keys that are different between
      // the last saved state and the current state
      const diff = {};
      Object.entries(object).forEach(([key, value]) => {
        if (!isEqual(value, lastSavedStore[object[idKey]][key]) || isTempId(object[idKey])) {
          diff[key] = value;
        }
      });
      return diff;
    },
  };
}

const TEMP_ID_PREFIX = 'temp-';

export function generateTempId() {
  return `${TEMP_ID_PREFIX}${String(Math.random()).slice(2)}`;
}

export function isTempId(id) {
  return id.startsWith(TEMP_ID_PREFIX);
}
