import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioBanner from '../StudioBanner.vue';

const sampleErrorMessage = 'This is an error message';

describe('StudioBanner', () => {
  test('render with defaults values', () => {
    render(StudioBanner, {
      props: {
        error: false,
      },
      routes: new VueRouter(),
      slots: {
        default: 'normal text',
      },
    });
    const banner = screen.getByTestId('studio-banner');
    expect(banner).toBeInTheDocument();
  });

  test('render with error true', () => {
    render(StudioBanner, {
      props: {
        error: true,
      },
      routes: new VueRouter(),
      slots: {
        default: sampleErrorMessage,
      },
    });

    const banner = screen.getByTestId('studio-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveStyle('background-color: rgb(255, 217, 211)');
    expect(screen.getByText(sampleErrorMessage)).toBeInTheDocument();
  });
});
