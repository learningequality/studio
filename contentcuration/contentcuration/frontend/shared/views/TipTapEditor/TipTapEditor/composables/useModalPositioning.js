import { nextTick, ref, watch } from 'vue';
import throttle from 'lodash/throttle';
import { isTouchDevice } from 'shared/utils/browserInfo';

// Gap between the anchor and the modal, and the smallest gap kept to the viewport edges.
const ANCHOR_GAP = 5;
const VIEWPORT_MARGIN = 8;

/**
 * @param {Function} getModalElement returns the element of the modal being positioned, or a
 *   nullish value while the modal is not rendered. It is used to measure the modal, so that an
 *   anchored modal can be kept inside the viewport, and to tell clicks inside it from clicks
 *   outside of it.
 */
export function useModalPositioning(getModalElement) {
  const isModalOpen = ref(false);
  const popoverStyle = ref({});
  const isModalCentered = ref(false);
  const anchorElement = ref(null);

  const updatePosition = () => {
    if (!anchorElement.value || isModalCentered.value || isTouchDevice) {
      return;
    }
    const rect = anchorElement.value.getBoundingClientRect();
    // The modal is fixed-positioned, so overflow past the bottom of the viewport cannot be
    // scrolled into view: pull the modal up by the overflowing amount instead. When the modal is
    // taller than the viewport, it is aligned to the top so that its beginning stays visible.
    const modalHeight = getModalElement()?.offsetHeight || 0;
    const highestTop = window.innerHeight - modalHeight - VIEWPORT_MARGIN;

    // Choose the top position that is at least VIEWPORT_MARGIN from the top of the viewport,
    // and at most the bottom of the anchor element plus ANCHOR_GAP,
    // but not overflowing past the bottom of the viewport.
    const top = Math.max(VIEWPORT_MARGIN, Math.min(rect.bottom + ANCHOR_GAP, highestTop));
    popoverStyle.value = {
      position: 'fixed',
      top: `${top}px`,
      left: `${rect.right}px`,
      transform: 'translateX(-100%)',
    };
  };

  const handleResize = () => {
    if (isModalOpen.value) {
      // Re-evaluate positioning on resize
      if (isTouchDevice && !isModalCentered.value) {
        setCenteredPosition();
      } else if (!isTouchDevice && anchorElement.value) {
        updatePosition();
      }
    }
  };

  // Throttle scroll and resize events
  const throttledUpdatePosition = throttle(updatePosition, 10);
  const throttledHandleResize = throttle(handleResize, 10);

  const setCenteredPosition = () => {
    isModalCentered.value = true;
    anchorElement.value = null;
    popoverStyle.value = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  };

  const setAnchoredPosition = targetElement => {
    anchorElement.value = targetElement;
    isModalCentered.value = false;
    updatePosition();
  };

  const openModal = ({ targetElement = null, centered = false } = {}) => {
    // Force centered positioning on mobile
    if (centered || !targetElement || isTouchDevice) {
      setCenteredPosition();
    } else {
      setAnchoredPosition(targetElement);
    }
    isModalOpen.value = true;
    if (!isModalCentered.value) {
      // The modal only renders once it is open, so re-position it once its height is known.
      nextTick(updatePosition);
    }
  };

  const closeModal = () => {
    isModalOpen.value = false;
    isModalCentered.value = false;
    anchorElement.value = null;
  };

  const setupClickOutside = closeFunction => {
    const clickOutsideHandler = event => {
      const modalElement = getModalElement();
      if (isModalOpen.value && modalElement && !modalElement.contains(event.target)) {
        // Allow the consumer to do its own cleanup.
        closeFunction();
      }
    };

    watch(isModalOpen, isOpen => {
      if (isOpen) {
        // The timeout prevents the click that opened the modal from immediately closing it.
        setTimeout(() => {
          document.addEventListener('mousedown', clickOutsideHandler, true);
          window.addEventListener('scroll', throttledUpdatePosition, true);
          window.addEventListener('resize', throttledHandleResize, true);
        }, 0);
      } else {
        document.removeEventListener('mousedown', clickOutsideHandler, true);
        window.removeEventListener('scroll', throttledUpdatePosition, true);
        window.removeEventListener('resize', throttledHandleResize, true);
        // Cancel any pending throttled calls
        throttledUpdatePosition.cancel();
        throttledHandleResize.cancel();
      }
    });
  };

  const cleanup = () => {
    window.removeEventListener('scroll', throttledUpdatePosition, true);
    window.removeEventListener('resize', throttledHandleResize, true);
    // Cancel any pending throttled calls
    throttledUpdatePosition.cancel();
    throttledHandleResize.cancel();
  };

  return {
    isModalOpen,
    popoverStyle,
    isModalCentered,
    openModal,
    closeModal,
    setupClickOutside,
    cleanup,
  };
}
