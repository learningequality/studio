/**
 * TEMPORARY WORKAROUND: Intercepts mathlive's aria-live region writes and
 * localizes the hardcoded English screen reader text in-place.
 *
 * Mathlive's defaultAnnounceHook writes English text directly to the aria-live
 * element's textContent. We intercept the textContent setter so the English
 * text is localized before it ever appears in the DOM — screen readers only
 * see the translated text.
 *
 * Remove when upstream fix lands:
 * https://github.com/arnog/mathlive/issues/2948
 */

import { onUnmounted, watch } from 'vue';
import { localizeAnnouncement } from './mathLiveA11yLocalize';

const NODE_TEXT_CONTENT = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
const WHITESPACE_ONLY_REGEX = /^[\s\u00A0\u202F]+$/;

/**
 * Install a textContent interceptor on the math-field's aria-live element
 * that localizes mathlive's English announcements before they reach the DOM.
 *
 * @param {HTMLElement} mathfield - The <math-field> element
 * @returns {Function} cleanup - Call to restore original textContent behavior
 */
export function setupA11yAnnounceInterceptor(mathfield) {
  const ariaLiveEl = mathfield.shadowRoot?.querySelector('[aria-live]');
  if (!ariaLiveEl) return () => {};

  Object.defineProperty(ariaLiveEl, 'textContent', {
    set(value) {
      if (typeof value === 'string' && value && !WHITESPACE_ONLY_REGEX.test(value)) {
        value = localizeAnnouncement(value);
      }
      NODE_TEXT_CONTENT.set.call(this, value);
    },
    get() {
      return NODE_TEXT_CONTENT.get.call(this);
    },
    configurable: true,
  });

  return () => Object.defineProperty(ariaLiveEl, 'textContent', NODE_TEXT_CONTENT);
}

/**
 * Vue composable that sets up announcement localization for a math-field element.
 *
 * @param {import('vue').Ref<HTMLElement|null>} mathfieldRef - Ref to the <math-field> element
 */
export function useMathLiveA11yAnnounce(mathfieldRef) {
  let cleanup = null;

  const teardown = () => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  };

  const setup = () => {
    teardown();
    const mathfield = mathfieldRef.value;
    if (!mathfield) return;
    cleanup = setupA11yAnnounceInterceptor(mathfield);
  };

  watch(mathfieldRef, setup, { immediate: true });
  onUnmounted(teardown);
}
