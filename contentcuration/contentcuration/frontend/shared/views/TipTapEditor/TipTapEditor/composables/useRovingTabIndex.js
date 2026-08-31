import { onMounted, onUnmounted } from 'vue';

const TOOLBAR_ITEM_SELECTOR = '[data-toolbar-item]';

/**
 * Roving tabindex over the `[data-toolbar-item]` controls inside `containerRef`,
 * per the WAI-ARIA APG toolbar pattern.
 *
 * Controls must not bind `tabindex` themselves — a re-render would strip the
 * toolbar's only tab stop.
 *
 * @param {import('vue').Ref<HTMLElement>} containerRef - the `role="toolbar"` element.
 */
export function useRovingTabIndex(containerRef) {
  // Vue clears template refs before `onUnmounted`, so hold the element itself
  // for the lifetime of the listeners.
  let container = null;
  let activeItem = null;
  let observer = null;

  // KListWithOverflow leaves overflowed controls in the DOM and hides them by
  // setting `visibility` on their wrapper, so only the computed value shows it.
  const getItems = () =>
    Array.from(container.querySelectorAll(TOOLBAR_ITEM_SELECTOR)).filter(
      item => window.getComputedStyle(item).visibility !== 'hidden',
    );

  const syncTabIndexes = () => {
    const items = getItems();
    if (!items.includes(activeItem)) {
      activeItem = items[0] || null;
    }
    items.forEach(item => item.setAttribute('tabindex', item === activeItem ? '0' : '-1'));
  };

  const handleKeydown = event => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) {
      return;
    }
    // Open menus own their arrow keys; a control must not become navigable
    // just because a menu was nested inside it.
    if (event.target.closest('[role="menu"]')) {
      return;
    }
    const items = getItems();
    const index = items.indexOf(event.target.closest(TOOLBAR_ITEM_SELECTOR));
    if (index === -1) {
      return;
    }
    event.preventDefault();
    // `window.isRTL` is the page direction, rendered server-side by `base.html`.
    const offset = window.isRTL ? -step : step;
    activeItem = items[(index + offset + items.length) % items.length];
    syncTabIndexes();
    activeItem.focus();
  };

  // Tabbing back into the toolbar must return to the control that last had focus.
  const handleFocusin = event => {
    const item = event.target.closest(TOOLBAR_ITEM_SELECTOR);
    if (item) {
      activeItem = item;
      syncTabIndexes();
    }
  };

  onMounted(() => {
    container = containerRef.value;
    container.addEventListener('keydown', handleKeydown);
    container.addEventListener('focusin', handleFocusin);
    observer = new MutationObserver(syncTabIndexes);
    // Filtering to `style` — the attribute that hides overflowed controls — also
    // keeps our own `tabindex` writes from re-triggering this.
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    });
    syncTabIndexes();
  });

  onUnmounted(() => {
    container.removeEventListener('keydown', handleKeydown);
    container.removeEventListener('focusin', handleFocusin);
    observer.disconnect();
  });
}
