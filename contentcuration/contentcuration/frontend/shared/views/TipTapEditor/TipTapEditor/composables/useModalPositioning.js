import { ref, watch } from 'vue';
import { useBreakpoint } from './useBreakpoint';

export function useModalPositioning() {
  const isModalOpen = ref(false);
  const popoverStyle = ref({});
  const isModalCentered = ref(false);
  const anchorElement = ref(null);
  const { isMobile } = useBreakpoint();

  let scrollRaf = null;
  let resizeRaf = null;

  const updatePosition = () => {
    if (!anchorElement.value || isModalCentered.value || isMobile.value) {
      return;
    }
    const rect = anchorElement.value.getBoundingClientRect();
    popoverStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 5}px`,
      left: `${rect.right}px`,
      transform: 'translateX(-100%)',
    };
  };

  // Throttle scroll and resize events
  const throttledUpdatePosition = () => {
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf);
    }
    scrollRaf = requestAnimationFrame(updatePosition);
  };

  const throttledHandleResize = () => {
    if (resizeRaf) {
      cancelAnimationFrame(resizeRaf);
    }
    resizeRaf = requestAnimationFrame(() => {
      if (isModalOpen.value) {
        // Re-evaluate positioning on resize
        if (isMobile.value && !isModalCentered.value) {
          setCenteredPosition();
        } else if (!isMobile.value && anchorElement.value) {
          updatePosition();
        }
      }
    });
  };

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
    if (centered || !targetElement || isMobile.value) {
      setCenteredPosition();
    } else {
      setAnchoredPosition(targetElement);
    }
    isModalOpen.value = true;
  };

  const closeModal = () => {
    isModalOpen.value = false;
    isModalCentered.value = false;
    anchorElement.value = null;
  };

  const setupClickOutside = (modalSelector, closeFunction) => {
    const clickOutsideHandler = event => {
      const modalElement = document.querySelector(modalSelector);
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
        // Cancel any pending animation frames
        if (scrollRaf) {
          cancelAnimationFrame(scrollRaf);
          scrollRaf = null;
        }
        if (resizeRaf) {
          cancelAnimationFrame(resizeRaf);
          resizeRaf = null;
        }
      }
    });
  };

  const cleanup = () => {
    window.removeEventListener('scroll', throttledUpdatePosition, true);
    window.removeEventListener('resize', throttledHandleResize, true);
    // Cancel any pending animation frames
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
    }
    if (resizeRaf) {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = null;
    }
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
