import { ref, watch } from 'vue';
import { useBreakpoint } from './useBreakpoint';

export function useModalPositioning() {
  const isModalOpen = ref(false);
  const popoverStyle = ref({});
  const isModalCentered = ref(false);
  const anchorElement = ref(null);
  const { isMobile } = useBreakpoint();

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

  // Allow passing a custom close function
  const setupClickOutside = (modalSelector, closeFunction) => {
    const clickOutsideHandler = event => {
      const modalElement = document.querySelector(modalSelector);
      if (isModalOpen.value && modalElement && !modalElement.contains(event.target)) {
        // Call the provided close function, which allows the consumer to do its own cleanup.
        closeFunction();
      }
    };

    const handleResize = () => {
      if (isModalOpen.value) {
        // Re-evaluate positioning on resize
        if (isMobile.value && !isModalCentered.value) {
          setCenteredPosition();
        } else if (!isMobile.value && anchorElement.value) {
          updatePosition();
        }
      }
    };

    watch(isModalOpen, isOpen => {
      if (isOpen) {
        // The timeout prevents the click that opened the modal from immediately closing it.
        setTimeout(() => {
          document.addEventListener('mousedown', clickOutsideHandler, true);
          window.addEventListener('scroll', updatePosition, true);
          window.addEventListener('resize', handleResize, true);
        }, 0);
      } else {
        document.removeEventListener('mousedown', clickOutsideHandler, true);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', handleResize, true);
      }
    });
  };

  const cleanup = () => {
    window.removeEventListener('scroll', updatePosition, true);
    window.removeEventListener('resize', updatePosition, true);
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
