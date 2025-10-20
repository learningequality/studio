import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import StudioChip from '../StudioChip.vue';

const mockRouter = new VueRouter();

const renderComponent = (props = {}) => {
  const defaultProps = {
    text: 'Test Chip',
    small: false,
    close: false,
    ...props,
  };

  return render(StudioChip, {
    props: defaultProps,
    routes: mockRouter,
  });
};

// Configure Testing Library to use data-test attributes
require('@testing-library/vue').configure({
  testIdAttribute: 'data-test',
});

describe('StudioChip', () => {
  test('renders with text prop', () => {
    renderComponent({ text: 'Test Chip' });
    expect(screen.getByText('Test Chip')).toBeInTheDocument();
  });

  test('renders close button when close prop is true', () => {
    renderComponent({ close: true });
    expect(screen.getByTestId('remove-chip')).toBeInTheDocument();
  });

  test('does not render close button when close prop is false', () => {
    renderComponent({ close: false });
    expect(screen.queryByTestId('remove-chip')).not.toBeInTheDocument();
  });

  test('applies small class when small prop is true', () => {
    renderComponent({ small: true });
    const chip = screen.getByText('Test Chip').closest('.studio-chip');
    expect(chip).toHaveClass('studio-chip--small');
  });

  test('emits click event when chip is clicked', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent();

    await user.click(screen.getByText('Test Chip'));
    expect(emitted().click).toHaveLength(1);
  });

  test('emits close and input events when close button is clicked', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({ close: true });

    await user.click(screen.getByTestId('remove-chip'));
    expect(emitted().close).toHaveLength(1);
    expect(emitted().input).toHaveLength(1);
  });

  test('applies clickable class when close prop is true', () => {
    renderComponent({ close: true });
    const chip = screen.getByText('Test Chip').closest('.studio-chip');
    expect(chip).toHaveClass('studio-chip--clickable');
  });
});
