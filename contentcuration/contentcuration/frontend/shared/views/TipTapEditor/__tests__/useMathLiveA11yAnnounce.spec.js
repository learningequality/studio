import { setupA11yAnnounceInterceptor } from '../TipTapEditor/components/math/useMathLiveA11yAnnounce';
import { localizeAnnouncement } from '../TipTapEditor/components/math/mathLiveA11yLocalize';

jest.mock('vue', () => ({
  watch: jest.fn(),
  onBeforeUnmount: jest.fn(),
}));

// Mock the localize module
jest.mock('../TipTapEditor/components/math/mathLiveA11yLocalize', () => ({
  localizeAnnouncement: jest.fn(text => `[localized] ${text}`),
}));

// Mock the strings module (default export + named export)
jest.mock('../TipTapEditor/components/math/MathLiveA11yStrings', () => ({
  __esModule: true,
  default: { fake: 'translator' },
  RELATION_NAMES: ['fraction'],
}));

/**
 * Create a mock math-field element with a shadow root containing an aria-live element.
 */
function createMockMathfield() {
  const mathfield = document.createElement('div');
  const shadowRoot = mathfield.attachShadow({ mode: 'open' });
  const ariaLiveEl = document.createElement('div');
  ariaLiveEl.setAttribute('aria-live', 'assertive');
  shadowRoot.appendChild(ariaLiveEl);
  return { mathfield, ariaLiveEl };
}

describe('setupA11yAnnounceInterceptor', () => {
  let mathfield, ariaLiveEl;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ mathfield, ariaLiveEl } = createMockMathfield());
  });

  it('returns a cleanup function', () => {
    const cleanup = setupA11yAnnounceInterceptor(mathfield);
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('localizes text when textContent is set on the aria-live element', () => {
    const cleanup = setupA11yAnnounceInterceptor(mathfield);

    ariaLiveEl.textContent = 'start of fraction:  \u00A0 ';

    expect(localizeAnnouncement).toHaveBeenCalledWith('start of fraction:  \u00A0 ');
    expect(ariaLiveEl.textContent).toBe('[localized] start of fraction:  \u00A0 '); // eslint-disable-line jest-dom/prefer-to-have-text-content

    cleanup();
  });

  it('does not localize empty text', () => {
    const cleanup = setupA11yAnnounceInterceptor(mathfield);

    ariaLiveEl.textContent = '';

    expect(localizeAnnouncement).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not localize whitespace-only text', () => {
    const cleanup = setupA11yAnnounceInterceptor(mathfield);

    // mathlive uses \u00A0 and \u202F as aria-live change hacks
    ariaLiveEl.textContent = ' \u00A0 ';

    expect(localizeAnnouncement).not.toHaveBeenCalled();

    cleanup();
  });

  it('restores original textContent behavior after cleanup', () => {
    const cleanup = setupA11yAnnounceInterceptor(mathfield);
    cleanup();

    ariaLiveEl.textContent = 'start of fraction: ';

    expect(localizeAnnouncement).not.toHaveBeenCalled();
    expect(ariaLiveEl.textContent).toBe('start of fraction: '); // eslint-disable-line jest-dom/prefer-to-have-text-content
  });
});
