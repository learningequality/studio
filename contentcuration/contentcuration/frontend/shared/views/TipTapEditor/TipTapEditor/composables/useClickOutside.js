import { onBeforeUnmount, watch } from 'vue';

// The toolbar's menus render in an overlay outside the editor; while one is open, a click
// is either on it or dismisses it. KDropdownMenu emits no open or close, so its trigger's
// ARIA state is the only signal: KDropdownMenu sets both attributes on its trigger, and
// FormatDropdown and PasteDropdown bind them by hand.
const hasOpenMenu = container =>
  Boolean(container.querySelector('[aria-haspopup][aria-expanded="true"]'));

/**
 * Closes the editor on a click outside it, and syncs its content when it loses focus.
 *
 * @param {Object} options
 * @param {Ref<HTMLElement>} options.container the editor's root element
 * @param {Ref<boolean>} options.isFocused whether the editor content has focus
 * @param {Function} options.isEditing whether the editor is open for editing
 * @param {Function} options.syncContent emits the content if it changed
 * @param {Function} options.close syncs the content and closes the editor
 */
export function useClickOutside({ container, isFocused, isEditing, syncContent, close }) {
  // A blur caused by a press syncs once the press ends, so the re-render it may cause
  // cannot move the pressed target away before the click.
  let isPressing = false;
  let hasHeldSync = false;

  const flushHeldSync = () => {
    if (!hasHeldSync) return;
    hasHeldSync = false;
    syncContent();
  };

  watch(isFocused, (focused, wasFocused) => {
    if (!wasFocused || focused) return;
    if (isPressing) {
      hasHeldSync = true;
    } else {
      syncContent();
    }
  });

  const handlePointerdown = () => {
    isPressing = true;
  };

  const handlePointerEnd = () => {
    isPressing = false;
    // Covers a press that ends without a click.
    setTimeout(flushHeldSync);
  };

  // Captured, so that clicks stopped on their way up (a Vuetify dialog stops all of them)
  // still count, and so this runs before the click's own handlers.
  const handleClick = event => {
    const root = container.value;
    const isOutside = isEditing() && root && !root.contains(event.target) && !hasOpenMenu(root);
    if (isOutside) {
      // `close` syncs the content itself.
      hasHeldSync = false;
      close();
    } else {
      flushHeldSync();
    }
  };

  const listeners = [
    ['pointerdown', handlePointerdown],
    ['pointerup', handlePointerEnd],
    ['pointercancel', handlePointerEnd],
    ['click', handleClick],
  ];
  let isListening = false;

  // Only an editor open for editing listens, so the many in view mode add nothing.
  const listen = () => {
    if (isListening) return;
    isListening = true;
    listeners.forEach(([type, handler]) => document.addEventListener(type, handler, true));
  };

  // A press still going on is over for this editor, and its held sync is due now.
  const stopListening = () => {
    if (!isListening) return;
    isListening = false;
    listeners.forEach(([type, handler]) => document.removeEventListener(type, handler, true));
    isPressing = false;
    flushHeldSync();
  };

  watch(isEditing, editing => (editing ? listen() : stopListening()), { immediate: true });

  // Reaches the parent only while the parent stays mounted: Vue stops a parent's
  // watchers before its children unmount, so a watcher relaying the update misses it.
  onBeforeUnmount(stopListening);
}
