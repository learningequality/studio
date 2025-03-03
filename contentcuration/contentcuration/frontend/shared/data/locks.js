import logging from 'shared/logging';

/**
 * Acquire an exclusive lock on the given name using the browser's Web Locks API,
 * and then run the given async function.
 *
 * @param {string} name
 * @param {boolean} exclusive
 * @param {function(): Promise} asyncFunction
 * @return {Promise<any>}
 */
export function acquireLock({ name, exclusive = false }, asyncFunction) {
  // If the browser supports the Web Locks API
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
  if (navigator.locks) {
    return navigator.locks.request(
      name,
      {
        mode: exclusive ? 'exclusive' : 'shared',
      },
      asyncFunction,
    );
  } else {
    // Track if clients aren't supporting the Web Locks API
    logging.error(new Error('Web Locks API not supported by browser'));
  }
  // Studio's supported browsers should support Web Locks but don't outright fail otherwise
  return asyncFunction();
}
