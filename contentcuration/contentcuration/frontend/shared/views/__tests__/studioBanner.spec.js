import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioBanner from '../StudioBanner.vue';

// Mock the Kolibri design system composable
const mockSendPoliteMessage = jest.fn();
jest.mock('kolibri-design-system/lib/composables/useKLiveRegion', () => ({
  __esModule: true,
  default: () => ({
    sendPoliteMessage: mockSendPoliteMessage,
  }),
}));

const sampleErrorMessage = 'This is an error message';

describe('StudioBanner', () => {
  beforeEach(() => {
    mockSendPoliteMessage.mockClear();
  });

  test('render with defaults values', () => {
    render(StudioBanner, {
      props: {
        error: false,
      },
      routes: new VueRouter(),
      slots: {
        default: '',
      }
    });

    const banner = screen.getByTestId('studio-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('banner', 'notranslate');
  });

  test('render with error true', () => {
    render(StudioBanner, {
      props: {
        error: true,
      },
      routes: new VueRouter(),
      slots: {
        default: sampleErrorMessage,
      }
    });

    const banner = screen.getByTestId('studio-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('banner', 'notranslate');
    expect(banner).toHaveStyle('background-color: rgb(255, 217, 211)');
    expect(screen.getByText(sampleErrorMessage)).toBeInTheDocument();
  });
});
