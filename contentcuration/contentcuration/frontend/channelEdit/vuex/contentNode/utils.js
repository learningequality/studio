import { ValidationErrors } from '../../constants';
import Licenses from 'shared/leUtils/Licenses';
import { isObjectLike, isPlainObject, throttle, memoize } from 'lodash';

/**
 * Validate node details - title, licence etc.
 * @param {Object} node A node.
 * @returns {Array} An array of error codes.
 */
export function validateNodeDetails(node) {
  const errors = [];

  // title is required
  if (!node.title) {
    errors.push(ValidationErrors.TITLE_REQUIRED);
  }

  // authoring information is required for resources
  if (!node.freeze_authoring_data && node.kind !== 'topic') {
    const licenseId = node.license && (node.license.id || node.license);
    const license = node.license && Licenses.get(licenseId);

    if (!license) {
      // license is required
      errors.push(ValidationErrors.LICENCE_REQUIRED);
    } else if (license.copyright_holder_required && !node.copyright_holder) {
      // copyright holder is required for certain licenses
      errors.push(ValidationErrors.COPYRIGHT_HOLDER_REQUIRED);
    } else if (license.is_custom && !node.license_description) {
      // license description is required for certain licenses
      errors.push(ValidationErrors.LICENCE_DESCRIPTION_REQUIRED);
    }
  }

  // mastery is required on exercises
  if (node.kind === 'exercise') {
    const mastery = node.extra_fields;
    if (!mastery || !mastery.mastery_model) {
      errors.push(ValidationErrors.MASTERY_MODEL_REQUIRED);
    } else if (
      mastery.mastery_model === 'm_of_n' &&
      (!mastery.m || !mastery.n || mastery.m > mastery.n)
    ) {
      errors.push(ValidationErrors.MASTERY_MODEL_INVALID);
    }
  }

  return errors;
}

/**
 * Validate node files - correct types, no associated errors, etc.
 * @param {Array} files An array of files for a node.
 * @returns {Array} An array of error codes.
 */
export function validateNodeFiles(files) {
  let errors = files.filter(f => f.error).map(f => f.error);
  let validPrimaryFiles = files.filter(f => !f.error && !f.preset.supplementary);

  if (!validPrimaryFiles.length) {
    errors.push(ValidationErrors.NO_VALID_PRIMARY_FILES);
  }
  return errors;
}


/**
 * Recursively sort object keys traversal order of given object.
 * @param {Object} where lodash.isObjectLike(param) is true
 * @returns {Object} with sorted keys for it and all children objects
 */
export function sortObj(obj) {
  return { 
    ...Object.keys(obj)
    .sort()
    .map(k => {
      // lodash.isPlainObject returns true for dict-style objects only
      return { [k]: (isPlainObject(obj[k]) ? sortObj(obj[k]) : obj[k]) }
    })
  }
}

/**
 * Implementation of Java's hashCode algorithm to give a unique hash for a string of any length. Initial usage was to reduce the size of cache keys generated from stringified objects that would be >50kb in size. https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript/34842797#34842797
 * @param {String}
 * @returns {Number} alike to a signed int32
 */
export function hashCode(str) {
  return str.split('').reduce((prevHash, currVal) =>
    (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
}


/**
 * Given an object, return a unique String that can be used to check equality or, in our case, generating cacheKeys
 * @param {any} all params are used as an array
 * @returns {String} that is cast to String from a Number returned from hashCode()
 */
export function cacheKeyFromObject(...args) {
  return String(
    hashCode(
      JSON.stringify(
        Object.assign(
          {},
          sortObj(args)
        )
      )
    )
  );
}


/**
 * Using memoize and throttle from lodash, we effectively cache a func by its params
 * so that we may throttle the same function called multiple times with different params
 *
 * The func received is used to generate a throttled function uniquely based on the
 * params passed to it with a unique cache key based on those params. You can expect
 * different parameters passed to the same function to be throttled separately.
 *
 * @param {Function} The function to be throttled
 * @param {Number} The ms time to throttle and memoize for, default: 0
 * @param {Object} Options to be passed to lodash.throttle, default: {}
 * @returns {Function} 
 */
export function memoizedThrottle(func, wait=0, opts={}) {
  // Adapted with gratitude from @Galadirith's comment: 
  // https://github.com/lodash/lodash/issues/2403#issuecomment-290760787
  const memo = memoize(
    function() {
      return throttle(func, wait, opts);
    }, 
    cacheKeyFromObject
  );
  return function() { 
    memo.apply(this, arguments).apply(this, arguments); 
    setTimeout(memo.cache.clear, wait);
  };
}
