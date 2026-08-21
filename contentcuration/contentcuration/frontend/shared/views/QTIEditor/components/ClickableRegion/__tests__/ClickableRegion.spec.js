import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import ClickableRegion from '../index.vue';

describe('ClickableRegion', () => {
  it('renders a button with the given aria-label', () => {
    render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
      },
      routes: new VueRouter(),
    });

    expect(screen.getByRole('button', { name: 'Test label' })).toBeInTheDocument();
  });

  it('does not render the button when suppressed is true', () => {
    render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
        suppressed: true,
      },
      routes: new VueRouter(),
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('emits a single click event on mouse click', async () => {
    const { emitted } = render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
      },
      routes: new VueRouter(),
    });

    await fireEvent.click(screen.getByRole('button'));

    expect(emitted().click).toHaveLength(1);
  });

  it('emits a single click event on Enter key', async () => {
    const { emitted } = render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
      },
      routes: new VueRouter(),
    });

    const button = screen.getByRole('button');
    await fireEvent.click(button);

    expect(emitted().click).toHaveLength(1);
  });

  it('emits a single click event on Space key', async () => {
    const { emitted } = render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
      },
      routes: new VueRouter(),
    });

    const button = screen.getByRole('button');
    await fireEvent.click(button);

    expect(emitted().click).toHaveLength(1);
  });
});
