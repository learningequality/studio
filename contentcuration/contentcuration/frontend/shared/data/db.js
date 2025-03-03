// eslint-disable-next-line import/no-named-as-default
import Dexie from 'dexie';
import 'dexie-observable';
import { v4 as uuidv4 } from 'uuid';
import Vue from 'vue';
import { APP_ID } from './constants';

if (process.env.NODE_ENV !== 'production') {
  // If not in production mode, turn Dexie's debug mode on.
  Dexie.debug = true;
}

// These are content node properties that always give a map of labels to 'true'.
// They are only ever one level deep.
// Due to a poor design decision by rtibbles - these use the same dot path to
// represent their materialized path as Dexie uses to represent nested updates.
// This means that when Dexie returns a change object about these,
// it nests the dot paths that should remain unnested.
const flatMapRegex =
  /^(accessibility_labels|categories|grade_levels|learner_needs|learning_activities|resource_types)\.(.+)/; // eslint-disable-line

// In order to intercept these issues at the earliest possible juncture
// we override the Dexie set and delete methods for key paths
// to prevent Dexie itself from causing mistakes of this kind.
// This means we don't need to run around after it second guessing
// what it should have done.
const originaldelByKeyPath = Dexie.delByKeyPath;

Dexie.delByKeyPath = function (obj, keyPath, value) {
  const findFlatPath = flatMapRegex.exec(keyPath);
  if (findFlatPath) {
    const key = findFlatPath[1];
    const path = findFlatPath[2];
    // since this function is called by `applyMods`, and we also use that to apply mods to Vuex
    // objects, we want to ensure that observers are triggered when we delete. To limit the
    // performance impact, this check for `__ob__` should tell us if there's an observer
    if (obj[key].__ob__) {
      Vue.delete(obj[key], path);
    } else {
      delete obj[key][path];
    }
    return obj;
  }
  return originaldelByKeyPath(obj, keyPath, value);
};

const originalsetByKeyPath = Dexie.setByKeyPath;

Dexie.setByKeyPath = function (obj, keyPath, value) {
  const findFlatPath = flatMapRegex.exec(keyPath);
  if (findFlatPath) {
    const key = findFlatPath[1];
    const path = findFlatPath[2];
    obj[key] = {
      ...(obj[key] || {}),
      [path]: value,
    };
    return obj;
  }
  return originalsetByKeyPath(obj, keyPath, value);
};

// A UUID to distinguish this JS client from others in the same browser.
export const CLIENTID = uuidv4();

// This can get set in order to update that this client is working in the scope of
// a specific channel, so we can scope changes.
let _channelScope = null;

export const channelScope = {
  get id() {
    return _channelScope;
  },
  set id(value) {
    _channelScope = value;
  },
};

const db = new Dexie(APP_ID);

export default db;
export const { Collection } = db;
