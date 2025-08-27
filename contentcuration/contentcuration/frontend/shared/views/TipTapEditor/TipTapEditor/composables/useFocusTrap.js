import { onMounted, onUnmounted, nextTick } from 'vue';

/**
 * A composable that traps focus within a specified element.
 * @param {import('vue').Ref<HTMLElement>} rootElRef
 * - A ref to the root element that should contain focus.
 */
export function useFocusTrap(rootElRef) {
  const getFocusableElements = () => {
    if (!rootElRef.value) return [];
    const elements = rootElRef.value.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    // Return only visible and enabled elements
    return Array.from(elements).filter(el => !el.disabled && el.offsetParent !== null);
  };

  const handleFocusTrap = event => {
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // When Shift+Tab is pressed on the first element, loop to the last
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // When Tab is pressed on the last element, loop to the first
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  onMounted(() => {
    // When the component mounts, focus the first interactive element
    nextTick(() => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    });

    document.addEventListener('keydown', handleFocusTrap);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleFocusTrap);
  });
}
