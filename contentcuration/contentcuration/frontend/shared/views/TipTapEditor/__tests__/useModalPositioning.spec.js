import { nextTick } from 'vue';
import { useModalPositioning } from '../TipTapEditor/composables/useModalPositioning';

// jsdom exposes `ontouchstart`, which would otherwise force centered positioning.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));

const VIEWPORT_HEIGHT = 500;

/**
 * jsdom does not lay out elements, so anchor and modal geometry has to be faked.
 */
function createAnchor({ bottom, right = 300 }) {
  const anchor = document.createElement('button');
  anchor.getBoundingClientRect = () => ({ bottom, right, top: bottom - 20, left: right - 40 });
  document.body.appendChild(anchor);
  return anchor;
}

function createModal(height) {
  const modal = document.createElement('div');
  Object.defineProperty(modal, 'offsetHeight', { value: height });
  document.body.appendChild(modal);
  return modal;
}

describe('useModalPositioning', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.innerHeight = VIEWPORT_HEIGHT;
  });

  it('anchors the modal below the target when it fits in the viewport', async () => {
    const modal = createModal(100);
    const { openModal, popoverStyle } = useModalPositioning(() => modal);

    openModal({ targetElement: createAnchor({ bottom: 100 }) });
    await nextTick();

    expect(popoverStyle.value.top).toBe('105px');
    expect(popoverStyle.value.left).toBe('300px');
  });

  it('pulls the modal up by the overflowing amount when it would overflow the bottom', async () => {
    const modal = createModal(200);
    const { openModal, popoverStyle } = useModalPositioning(() => modal);

    // Below the anchor the modal would end at 400 + 5 + 200 = 605px, past the 500px viewport.
    openModal({ targetElement: createAnchor({ bottom: 400 }) });
    await nextTick();

    expect(popoverStyle.value.top).toBe(`${VIEWPORT_HEIGHT - 200 - 8}px`);
  });

  it('keeps the modal within the top of the viewport when it is taller than the viewport', async () => {
    const modal = createModal(VIEWPORT_HEIGHT + 200);
    const { openModal, popoverStyle } = useModalPositioning(() => modal);

    openModal({ targetElement: createAnchor({ bottom: 400 }) });
    await nextTick();

    expect(popoverStyle.value.top).toBe('8px');
  });

  it('measures the modal again once it has been rendered', async () => {
    // The modal only renders once it is open, so there is nothing to measure while opening it.
    let modal = null;
    const { openModal, popoverStyle } = useModalPositioning(() => modal);

    openModal({ targetElement: createAnchor({ bottom: 400 }) });
    expect(popoverStyle.value.top).toBe('405px');

    modal = createModal(200);
    await nextTick();

    expect(popoverStyle.value.top).toBe(`${VIEWPORT_HEIGHT - 200 - 8}px`);
  });

  it('leaves centered positioning untouched', async () => {
    const modal = createModal(200);
    const { openModal, popoverStyle, isModalCentered } = useModalPositioning(() => modal);

    openModal({ centered: true, targetElement: createAnchor({ bottom: 400 }) });
    await nextTick();

    expect(isModalCentered.value).toBe(true);
    expect(popoverStyle.value.top).toBe('50%');
  });

  describe('setupClickOutside', () => {
    let closeOpenedModal;

    beforeEach(() => {
      jest.useFakeTimers();
      closeOpenedModal = () => {};
    });

    afterEach(async () => {
      // Closing the modal detaches the listener the composable added to the document.
      closeOpenedModal();
      await nextTick();
      jest.useRealTimers();
    });

    async function openModalWithClickOutside() {
      const modal = createModal(100);
      const anchor = createAnchor({ bottom: 100 });
      const closeFunction = jest.fn();
      const { openModal, closeModal, setupClickOutside } = useModalPositioning(() => modal);
      setupClickOutside(closeFunction);

      openModal({ targetElement: anchor });
      closeOpenedModal = closeModal;
      // The listener is attached on the tick after the modal opens, on a zero timeout.
      await nextTick();
      jest.runAllTimers();

      return { modal, anchor, closeFunction };
    }

    it('closes the modal when the click lands outside of it', async () => {
      const { anchor, closeFunction } = await openModalWithClickOutside();

      anchor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(closeFunction).toHaveBeenCalled();
    });

    it('leaves the modal open when the click lands inside of it', async () => {
      const { modal, closeFunction } = await openModalWithClickOutside();

      modal.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(closeFunction).not.toHaveBeenCalled();
    });
  });
});
