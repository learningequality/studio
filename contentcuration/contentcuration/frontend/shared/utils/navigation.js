/**
 * Navigate the browser to a new URL via full page load.
 *
 * Extracted so tests can mock this module instead of fighting
 * jsdom's non-configurable window.location properties.
 */
export function redirectBrowser(url) {
  window.location.assign(url);
}
