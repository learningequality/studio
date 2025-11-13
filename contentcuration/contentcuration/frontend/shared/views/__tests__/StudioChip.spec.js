import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import StudioChip from '../StudioChip.vue';

const mockRouter = new VueRouter();

const renderComponent = (props = {}) => {
  const defaultProps = {
    text: 'Test Chip',
    close: false,
    ...props,
  };

  return render(StudioChip, {
    props: defaultProps,
    routes: mockRouter,
  });
};

describe('StudioChip', () => {
  test('renders with text prop', () => {
    renderComponent({ text: 'Test Chip' });
    expect(screen.getByText('Test Chip')).toBeInTheDocument();
  });

  test('renders close button when close prop is true', () => {
    renderComponent({ close: true });
    expect(screen.getByLabelText('Remove Test Chip')).toBeInTheDocument();
  });

  test('does not render close button when close prop is false', () => {
    renderComponent({ close: false });
    expect(screen.queryByLabelText('Remove Test Chip')).not.toBeInTheDocument();
  });

  test('emits close event when close button is clicked', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({ close: true });

    await user.click(screen.getByLabelText('Remove Test Chip'));
    expect(emitted().close).toHaveLength(1);
  });
});
