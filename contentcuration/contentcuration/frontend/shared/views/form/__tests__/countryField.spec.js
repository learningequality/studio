import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import CountryField from '../CountryField.vue';

function renderComponent(props = {}) {
  return render(CountryField, { props, routes: new VueRouter() });
}

// Tabbing straight out of an open dropdown moves focus into its listbox,
// so close it first to actually leave the field.
async function leaveField() {
  await userEvent.click(screen.getByRole('combobox'));
  await userEvent.keyboard('{Escape}');
  await userEvent.tab();
}

function lastInput(emitted) {
  const events = emitted().input;
  return events[events.length - 1][0];
}

describe('CountryField', () => {
  it('renders the default label', () => {
    renderComponent();
    expect(screen.getByRole('combobox', { name: 'Select all that apply' })).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    renderComponent({ label: 'Target location' });
    expect(screen.getByRole('combobox', { name: 'Target location' })).toBeInTheDocument();
  });

  describe('in multiple selection mode', () => {
    it('emits the selected countries as an array of English names', async () => {
      const { emitted } = renderComponent({ value: ['Kenya'] });

      await userEvent.type(screen.getByRole('combobox'), 'Czech');
      await userEvent.click(await screen.findByRole('option', { name: 'Czech Republic' }));

      expect(lastInput(emitted)).toEqual(['Kenya', 'Czech Republic']);
    });

    it('clears the search text after a selection', async () => {
      renderComponent();

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'Czech');
      await userEvent.click(await screen.findByRole('option', { name: 'Czech Republic' }));

      expect(input).toHaveValue('');
    });
  });

  describe('in single selection mode', () => {
    it('emits the selected country as an English name', async () => {
      const { emitted } = renderComponent({ multiple: false });

      await userEvent.type(screen.getByRole('combobox'), 'Czech');
      await userEvent.click(await screen.findByRole('option', { name: 'Czech Republic' }));

      expect(lastInput(emitted)).toBe('Czech Republic');
    });

    it('shows the selected country in the input', () => {
      renderComponent({ multiple: false, value: 'Kenya' });
      expect(screen.getByRole('combobox')).toHaveValue('Kenya');
    });

    it('renders with no selection when no value is given', () => {
      renderComponent({ multiple: false });
      expect(screen.getByRole('combobox')).toHaveValue('');
    });
  });

  describe('with a non-English interface language', () => {
    beforeEach(() => {
      window.languageCode = 'es';
    });

    afterEach(() => {
      delete window.languageCode;
    });

    it('shows translated country names but emits English names', async () => {
      const { emitted } = renderComponent();

      await userEvent.type(screen.getByRole('combobox'), 'Alemania');
      await userEvent.click(await screen.findByRole('option', { name: 'Alemania' }));

      expect(lastInput(emitted)).toEqual(['Germany']);
    });
  });

  it('shows a message when no country matches the search', async () => {
    renderComponent();

    await userEvent.type(screen.getByRole('combobox'), 'zzzzz');

    expect(await screen.findByText('No countries found')).toBeInTheDocument();
  });

  it('disables the input when disabled', () => {
    renderComponent({ disabled: true });
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  describe('when required', () => {
    it('shows an error after leaving the field empty', async () => {
      renderComponent({ required: true });

      await leaveField();

      expect(await screen.findByText('Field is required')).toBeInTheDocument();
    });

    it('does not show an error before the field is touched', () => {
      renderComponent({ required: true });
      expect(screen.queryByText('Field is required')).not.toBeInTheDocument();
    });

    it('does not show an error when a country is selected', async () => {
      renderComponent({ required: true, value: ['Kenya'] });

      await leaveField();

      expect(screen.queryByText('Field is required')).not.toBeInTheDocument();
    });
  });
});
