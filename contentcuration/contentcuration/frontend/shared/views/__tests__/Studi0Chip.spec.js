// StudioChip.spec.js
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import StudioChip from '../StudioChip.vue';

// Mock Vue Router
const mockRouter = new VueRouter();

// Helper function to render the component
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

describe('StudioChip', () => {
  test('renders with default values', () => {
    renderComponent();

    const chip = screen.getByText('Test Chip');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('studio-chip');
  });

  test('renders chip with custom text content', () => {
    renderComponent({ text: 'Custom Chip Text' });

    expect(screen.getByText('Custom Chip Text')).toBeInTheDocument();
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

    const chip = screen.getByText('Test Chip');
    expect(chip).toHaveClass('studio-chip--small');
  });

  test('does not apply small class when small prop is false', () => {
    renderComponent({ small: false });

    const chip = screen.getByText('Test Chip');
    expect(chip).not.toHaveClass('studio-chip--small');
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

    const chip = screen.getByText('Test Chip');
    expect(chip).toHaveClass('studio-chip--clickable');
  });

  test('renders with slot content', () => {
    render(StudioChip, {
      slots: {
        default: '<span>Slot Content</span>',
      },
      routes: mockRouter,
    });

    expect(screen.getByText('Slot Content')).toBeInTheDocument();
  });

  test('has proper element structure with text before close button', () => {
    renderComponent({ close: true, text: 'Test Text' });

    const chip = screen.getByText('Test Text');
    const closeButton = screen.getByTestId('remove-chip');

    expect(chip).toBeInTheDocument();
    expect(closeButton).toBeInTheDocument();
  });

  test('handles empty text prop', () => {
    renderComponent({ text: '' });

    const chip = screen.getByRole('generic'); // The chip container
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('studio-chip');
  });
});
