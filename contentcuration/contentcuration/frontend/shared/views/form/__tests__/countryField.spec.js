import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import CountryField from '../CountryField.vue';
import { commonStrings } from 'shared/strings/commonStrings';
import { createTranslator } from 'shared/i18n';

const mockSendPoliteMessage = jest.fn();
jest.mock('kolibri-design-system/lib/composables/useKLiveRegion', () => ({
  __esModule: true,
  default: () => ({
    sendPoliteMessage: mockSendPoliteMessage,
    sendAssertiveMessage: jest.fn(),
  }),
}));

const { locationLabel$, locationRequiredMessage$, noCountriesFound$ } = createTranslator(
  'CountryField',
  CountryField.$trs,
);
const { clearAction$, optionRemovedLabel$, selectionsClearedLabel$ } = commonStrings;

const KENYA = 'Kenya';
const CZECH_REPUBLIC = 'Czech Republic';
const GERMANY = 'Germany';
const GERMANY_IN_SPANISH = 'Alemania';
const CUSTOM_LABEL = 'Target location';

function renderComponent(props = {}) {
  return render(CountryField, { props, routes: new VueRouter() });
}

function renderRequiredField(value) {
  const HostForm = {
    components: { CountryField },
    data() {
      return { value };
    },
    template: `
      <div>
        <CountryField ref="countryField" v-model="value" required />
        <button @click="$refs.countryField.validate()">Validate</button>
      </div>
    `,
  };
  return render(HostForm, { routes: new VueRouter() });
}

function lastInput(emitted) {
  const events = emitted().input;
  return events[events.length - 1][0];
}

describe('CountryField', () => {
  beforeEach(() => {
    mockSendPoliteMessage.mockClear();
  });

  it('renders the default label', () => {
    renderComponent();
    expect(screen.getByRole('combobox', { name: locationLabel$() })).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    renderComponent({ label: CUSTOM_LABEL });
    expect(screen.getByRole('combobox', { name: CUSTOM_LABEL })).toBeInTheDocument();
  });

  describe('in multiple selection mode', () => {
    it('emits the selected countries as an array of English names', async () => {
      const { emitted } = renderComponent({ value: [KENYA] });

      await userEvent.type(screen.getByRole('combobox'), 'Czech');
      await userEvent.click(await screen.findByRole('option', { name: CZECH_REPUBLIC }));

      expect(lastInput(emitted)).toEqual([KENYA, CZECH_REPUBLIC]);
    });

    it('clears the search text after a selection', async () => {
      renderComponent();

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'Czech');
      await userEvent.click(await screen.findByRole('option', { name: CZECH_REPUBLIC }));

      expect(input).toHaveValue('');
    });

    it('announces the number of cleared selections when clearing', async () => {
      renderComponent({ value: [KENYA, CZECH_REPUBLIC] });

      await userEvent.click(screen.getByRole('button', { name: clearAction$() }));

      expect(mockSendPoliteMessage).toHaveBeenCalledWith(selectionsClearedLabel$({ count: 2 }));
    });
  });

  describe('in single selection mode', () => {
    it('emits the selected country as an English name', async () => {
      const { emitted } = renderComponent({ multiple: false });

      await userEvent.type(screen.getByRole('combobox'), 'Czech');
      await userEvent.click(await screen.findByRole('option', { name: CZECH_REPUBLIC }));

      expect(lastInput(emitted)).toBe(CZECH_REPUBLIC);
    });

    it('shows the selected country in the input', () => {
      renderComponent({ multiple: false, value: KENYA });
      expect(screen.getByRole('combobox')).toHaveValue(KENYA);
    });

    it('renders with no selection when no value is given', () => {
      renderComponent({ multiple: false });
      expect(screen.getByRole('combobox')).toHaveValue('');
    });

    it('announces the removed country, not a count, when clearing', async () => {
      renderComponent({ multiple: false, value: KENYA });

      await userEvent.click(screen.getByRole('button', { name: clearAction$() }));

      expect(mockSendPoliteMessage).toHaveBeenCalledWith(optionRemovedLabel$({ label: KENYA }));
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

      await userEvent.type(screen.getByRole('combobox'), GERMANY_IN_SPANISH);
      await userEvent.click(await screen.findByRole('option', { name: GERMANY_IN_SPANISH }));

      expect(lastInput(emitted)).toEqual([GERMANY]);
    });
  });

  it('shows a message when no country matches the search', async () => {
    const { container } = renderComponent();

    await userEvent.type(screen.getByRole('combobox'), 'zzzzz');

    expect(await within(container).findByText(noCountriesFound$())).toBeInTheDocument();
    expect(within(container).queryAllByRole('option', { hidden: true })).toHaveLength(0);
  });

  it('disables the input when disabled', () => {
    renderComponent({ disabled: true });
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  describe('when required', () => {
    it('does not show an error before it is validated', () => {
      renderRequiredField([]);
      expect(screen.queryByText(locationRequiredMessage$())).not.toBeInTheDocument();
    });

    it('shows an error when validated with no country selected', async () => {
      renderRequiredField([]);

      await userEvent.click(screen.getByRole('button', { name: 'Validate' }));

      expect(screen.getByRole('combobox')).toHaveAccessibleDescription(locationRequiredMessage$());
    });

    it('does not show an error when validated with a country selected', async () => {
      renderRequiredField([KENYA]);

      await userEvent.click(screen.getByRole('button', { name: 'Validate' }));

      expect(screen.queryByText(locationRequiredMessage$())).not.toBeInTheDocument();
    });

    it('clears the error once a country is selected', async () => {
      renderRequiredField([]);

      await userEvent.click(screen.getByRole('button', { name: 'Validate' }));
      expect(screen.getByRole('combobox')).toHaveAccessibleDescription(locationRequiredMessage$());

      await userEvent.type(screen.getByRole('combobox'), KENYA);
      await userEvent.click(await screen.findByRole('option', { name: KENYA }));

      expect(screen.queryByText(locationRequiredMessage$())).not.toBeInTheDocument();
    });
  });
});
