/**
 * Adapted from https://raw.githubusercontent.com/nbubna/store/master/src/store.on.js
 *
 * Copyright (c) 2013 ESHA Research
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * Makes it easy to watch for storage events by enhancing the events and
 * allowing binding to particular keys and/or namespaces.
 *
 * // listen to particular key storage events (yes, this is namespace sensitive)
 * store.on('foo', function listenToFoo(e){ console.log('foo was changed:', e); });
 * store.off('foo', listenToFoo);
 *
 * // listen to all storage events (also namespace sensitive)
 * store.on(function storageEvent(e){ console.log('web storage:', e); });
 * store.off(storageEvent);
 *
 * Status: BETA - useful, if you aren't using IE8 or worse
 */

import store2 from 'store2';

const { _ } = store2;

_.on = function (key, fn) {
  if (!fn) {
    fn = key;
    key = '';
  } // no key === all keys
  const listener = e => {
    const k = this._out(e.key); // undefined if key is not in the namespace
    if (
      k &&
      (k === key || // match key if listener has one
        (!key && k !== '_-bad-_')) && // match catch-all, except internal test
      (!e.storageArea || e.storageArea === this._area)
    ) {
      // match area, if available
      return fn.call(this, _.event.call(this, k, e));
    }
  };
  window.addEventListener('storage', (fn[key + '-listener'] = listener), false);
  return this;
};

_.off = function (key, fn) {
  if (!fn) {
    fn = key;
    key = '';
  } // no key === all keys
  window.removeEventListener('storage', fn[key + '-listener']);
  return this;
};

_.once = function (key, fn) {
  if (!fn) {
    fn = key;
    key = '';
  }
  let listener;
  return this.on(
    key,
    (listener = () => {
      this.off(key, listener);
      return fn.apply(this, arguments);
    }),
  );
};

_.event = function (k, e) {
  const event = {
    key: k,
    namespace: this.namespace(),
    newValue: _.parse(e.newValue),
    oldValue: _.parse(e.oldValue),
    url: e.url || e.uri,
    storageArea: e.storageArea,
    source: e.source,
    timeStamp: e.timeStamp,
    originalEvent: e,
  };
  if (_.cache) {
    const min = _.expires(e.newValue || e.oldValue);
    if (min) {
      event.expires = _.when(min);
    }
  }
  return event;
};

// _ policy is to not throw errors on old browsers
const isOld = !window.addEventListener ? function () {} : null;
_.fn('on', isOld || _.on);
_.fn('off', isOld || _.off);
_.fn('once', isOld || _.once);

export default store2;
