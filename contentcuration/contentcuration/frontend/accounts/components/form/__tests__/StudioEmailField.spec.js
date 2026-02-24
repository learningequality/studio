import VueRouter from 'vue-router';
import { render, screen, fireEvent } from '@testing-library/vue';
import StudioEmailField from '../StudioEmailField.vue';

const renderComponent = (props = {}) =>
  render(StudioEmailField, {
    router: new VueRouter(),
    props: {
      value: '',
      ...props,
    },
  });

describe('StudioEmailField', () => {
  describe('rendering', () => {
    it('renders with the default "Email address" label', () => {
      renderComponent();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('renders with a custom label when provided', () => {
      renderComponent({ label: 'Work email' });
      expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    });

    it('is disabled when the disabled prop is true', () => {
      renderComponent({ disabled: true });
      expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    });
  });

  describe('input handling', () => {
    it('emits trimmed value — strips leading and trailing whitespace', async () => {
      const { emitted } = renderComponent();
      const input = screen.getByLabelText(/email address/i);
      await fireEvent.update(input, '  test@example.com  ');
      expect(emitted().input).toBeTruthy();
      expect(emitted().input[0][0]).toBe('test@example.com');
    });

    it('emits blur event when the field loses focus', async () => {
      const { emitted } = renderComponent();
      const input = screen.getByLabelText(/email address/i);
      await fireEvent.blur(input);
      expect(emitted().blur).toBeTruthy();
    });
  });

  describe('error display', () => {
    it('shows the first error message when errorMessages is non-empty', () => {
      renderComponent({ errorMessages: ['Please enter a valid email address'] });
      expect(screen.getByText('Please enter a valid email address')).toBeVisible();
    });

    it('shows no error text when errorMessages is empty', () => {
      renderComponent({ errorMessages: [] });
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });

    it('shows only the first error when multiple messages are provided', () => {
      renderComponent({ errorMessages: ['First error', 'Second error'] });
      expect(screen.getByText('First error')).toBeVisible();
      expect(screen.queryByText('Second error')).not.toBeInTheDocument();
    });
  });
});
