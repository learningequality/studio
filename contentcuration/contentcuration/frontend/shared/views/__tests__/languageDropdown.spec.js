import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import LanguageDropdown from '../LanguageDropdown.vue';
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

const { languageItemText$, languageRequired$ } = createTranslator(
  'LanguageDropdown',
  LanguageDropdown.$trs,
);
const { clearAction$, optionRemovedLabel$ } = commonStrings;

const ENGLISH = languageItemText$({ language: 'English', code: 'en' });
const SPANISH = languageItemText$({ language: 'Español', code: 'es' });

function renderComponent(props = {}) {
  return render(LanguageDropdown, { router: new VueRouter(), props });
}

function lastInput(emitted) {
  const events = emitted().input;
  return events[events.length - 1][0];
}

describe('LanguageDropdown', () => {
  it('renders the language field', () => {
    renderComponent();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('emits the selected language id in single mode', async () => {
    const { emitted } = renderComponent();

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: ENGLISH }));

    expect(lastInput(emitted)).toEqual('en');
  });

  it('emits an array of language ids in multiple mode', async () => {
    const { emitted } = renderComponent({ multiple: true, value: ['en'] });

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: SPANISH }));

    expect(lastInput(emitted)).toEqual(['en', 'es']);
  });

  it('filters options using the configured searchKeys', async () => {
    renderComponent();
    const combobox = screen.getByRole('combobox');

    await userEvent.click(combobox);
    await userEvent.type(combobox, 'Spanish');
    expect(await screen.findByRole('option', { name: SPANISH })).toBeInTheDocument();

    await userEvent.clear(combobox);
    await userEvent.type(combobox, 'es');
    expect(await screen.findByRole('option', { name: SPANISH })).toBeInTheDocument();
  });

  it('hides languages passed in excludeLanguages', async () => {
    renderComponent({ excludeLanguages: ['en'] });

    await userEvent.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: SPANISH })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: ENGLISH })).not.toBeInTheDocument();
  });

  it('sets aria-required on the combobox input when required', () => {
    renderComponent({ required: true });
    expect(screen.getByRole('combobox')).toBeRequired();
  });

  it('does not set aria-required on the combobox input by default', () => {
    renderComponent();
    expect(screen.getByRole('combobox')).not.toBeRequired();
  });

  it('clears the selection when the clear button is clicked', async () => {
    const { emitted } = renderComponent({ value: 'en' });

    await userEvent.click(screen.getByRole('button', { name: clearAction$() }));

    expect(lastInput(emitted)).toBeNull();
  });

  it('announces the removed option label, not a count, when clearing in single mode', async () => {
    mockSendPoliteMessage.mockClear();
    renderComponent({ value: 'en' });

    await userEvent.click(screen.getByRole('button', { name: clearAction$() }));

    expect(mockSendPoliteMessage).toHaveBeenCalledWith(optionRemovedLabel$({ label: ENGLISH }));
  });

  it('validates a required language, then clears the error once one is picked', async () => {
    const HostForm = {
      components: { LanguageDropdown },
      data() {
        return { value: null };
      },
      template: `
        <div>
          <LanguageDropdown ref="dropdown" v-model="value" required />
          <button @click="$refs.dropdown.validate()">Validate</button>
        </div>
      `,
    };
    render(HostForm, { router: new VueRouter() });

    await userEvent.click(screen.getByRole('button', { name: 'Validate' }));
    expect(await screen.findByText(languageRequired$())).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: ENGLISH }));

    expect(screen.queryByText(languageRequired$())).not.toBeInTheDocument();
  });
});
