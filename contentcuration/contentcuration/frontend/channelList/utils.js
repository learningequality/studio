import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import isObject from 'lodash/isObject';

function objectDifference(objectA, objectB) {
  const diff = {};
  Object.entries(objectA).forEach(([key, value]) => {
    if (!isEqual(value, objectB[key])) {
      if (isObject(value)) {
        diff[key] = objectDifference(value, objectB[key]);
      } else {
        diff[key] = value;
      }
    }
  });
  return diff;
}

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
      const id = object[idKey];
      return isTempId(id) ? object : objectDifference(object, lastSavedStore[id]);
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
