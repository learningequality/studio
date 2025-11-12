import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioChip from '../StudioChip.vue';

const router = new VueRouter({
  routes: [],
});

describe('StudioChip', () => {
  it('renders chip with text content', () => {
    render(StudioChip, {
      router,
      slots: {
        default: 'Test Tag',
      },
    });

    expect(screen.getByText('Test Tag')).toBeInTheDocument();
  });

  it('applies notranslate class when prop is true', () => {
    const { container } = render(StudioChip, {
      router,
      props: {
        notranslate: true,
      },
      slots: {
        default: 'User Content',
      },
    });

    const chip = container.querySelector('.studio-chip');
    expect(chip).toHaveClass('notranslate');
  });

  it('does not apply notranslate class when prop is false', () => {
    const { container } = render(StudioChip, {
      router,
      props: {
        notranslate: false,
      },
      slots: {
        default: 'Regular Content',
      },
    });

    const chip = container.querySelector('.studio-chip');
    expect(chip).not.toHaveClass('notranslate');
  });

  it('renders multiple chips independently', () => {
    const { container: container1 } = render(StudioChip, {
      router,
      slots: {
        default: 'Chip 1',
      },
    });

    const { container: container2 } = render(StudioChip, {
      router,
      slots: {
        default: 'Chip 2',
      },
    });

    expect(container1.querySelector('.studio-chip')).toHaveTextContent('Chip 1');
    expect(container2.querySelector('.studio-chip')).toHaveTextContent('Chip 2');
  });

  it('has correct styling classes', () => {
    const { container } = render(StudioChip, {
      router,
      slots: {
        default: 'Styled Chip',
      },
    });

    const chip = container.querySelector('.studio-chip');
    expect(chip).toBeTruthy();
    expect(chip.tagName).toBe('SPAN');
  });
});
