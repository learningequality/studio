import { render } from '@testing-library/vue';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import { useLinkHandling } from '../TipTapEditor/composables/useLinkHandling';

// jsdom exposes `ontouchstart`, which would otherwise force centered positioning.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));

const COORDS = { left: 100, bottom: 50 };

function createEditor() {
  const selection = { from: 1, to: 1, empty: true };
  return {
    on: () => {},
    off: () => {},
    state: { selection },
    view: { state: { selection }, coordsAtPos: () => COORDS },
  };
}

function renderLinkHandling() {
  let linkHandling;
  render(
    {
      template: '<div />',
      setup() {
        linkHandling = useLinkHandling(ref(createEditor()));
      },
    },
    { router: new VueRouter() },
  );
  return linkHandling;
}

describe('useLinkHandling', () => {
  afterEach(() => {
    delete window.isRTL;
  });

  it('anchors the link editor from the left edge in LTR', () => {
    const { openLinkEditor, popoverStyle } = renderLinkHandling();

    openLinkEditor();

    expect(popoverStyle.value.left).toBe(`${COORDS.left}px`);
    expect(popoverStyle.value.right).toBeUndefined();
  });

  it('anchors the link editor from the right edge in RTL', () => {
    window.isRTL = true;
    const { openLinkEditor, popoverStyle } = renderLinkHandling();

    openLinkEditor();

    expect(popoverStyle.value.right).toBe(`${window.innerWidth - COORDS.left}px`);
    expect(popoverStyle.value.left).toBeUndefined();
  });
});
