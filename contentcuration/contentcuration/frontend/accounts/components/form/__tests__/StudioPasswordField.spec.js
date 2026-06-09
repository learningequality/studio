import VueRouter from 'vue-router';
import { render, screen, fireEvent } from '@testing-library/vue';
import StudioPasswordField from '../StudioPasswordField.vue';

const renderComponent = (props = {}) =>
  render(StudioPasswordField, {
    router: new VueRouter(),
    props: {
      value: '',
      ...props,
    },
  });

describe('StudioPasswordField', () => {
  describe('rendering', () => {
    it('renders with the default "Password" label', () => {
      renderComponent();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    it('renders with a custom label when provided', () => {
      renderComponent({ label: 'Confirm password' });
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });
  });

  describe('input handling', () => {
    it('emits raw value without trimming whitespace', async () => {
      const { emitted } = renderComponent();
      const input = screen.getByLabelText(/^password$/i);
      await fireEvent.update(input, '  mypassword  ');
      expect(emitted().input).toBeTruthy();
      expect(emitted().input[0][0]).toBe('  mypassword  ');
    });

    it('emits blur event when the field loses focus', async () => {
      const { emitted } = renderComponent();
      const input = screen.getByLabelText(/^password$/i);
      await fireEvent.blur(input);
      expect(emitted().blur).toBeTruthy();
    });
  });

  describe('error display', () => {
    it('shows the first error message when errorMessages is non-empty', () => {
      renderComponent({ errorMessages: ['Password should be at least 8 characters long'] });
      expect(screen.getByText('Password should be at least 8 characters long')).toBeVisible();
    });

    it('shows no error text when errorMessages is empty', () => {
      renderComponent({ errorMessages: [] });
      expect(
        screen.queryByText('Password should be at least 8 characters long'),
      ).not.toBeInTheDocument();
    });

    it('shows only the first error when multiple messages are provided', () => {
      renderComponent({ errorMessages: ['First error', 'Second error'] });
      expect(screen.getByText('First error')).toBeVisible();
      expect(screen.queryByText('Second error')).not.toBeInTheDocument();
    });
  });
});
