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

const sampleErrorMessage = "This is an error message";
const sampleInfoMessage = "This is an info message";

// Helper function to render the component with the provided props
const renderComponent = (props = {}) =>
  render(StudioBanner, {
    props: {
      error: false,
      errorText: '',
      ...props
    },
    routes: new VueRouter(),
  });

describe('StudioBanner', () => {
  beforeEach(() => {
    mockSendPoliteMessage.mockClear();
  });

  test('smoke test - with default props', () => {
    renderComponent({ errorText: sampleInfoMessage });

    const banner = screen.getByTestId('studio-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('banner', 'notranslate');
    expect(screen.getByText(sampleInfoMessage)).toBeInTheDocument();
  });

  test('error true with errorText', () => {
    renderComponent({ 
      error: true, 
      errorText: sampleErrorMessage 
    });

    const banner = screen.getByTestId('studio-banner');
    expect(banner).toHaveStyle('background-color: rgb(255, 217, 211)');
    expect(screen.getByText(sampleErrorMessage)).toBeInTheDocument();
    expect(mockSendPoliteMessage).toHaveBeenCalledWith(sampleErrorMessage);
  });
});