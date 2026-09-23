import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import LanguageDropdown from '../LanguageDropdown.vue';
import { commonStrings } from 'shared/strings/commonStrings';
import { createTranslator } from 'shared/i18n';

const { languageItemText$ } = createTranslator('LanguageDropdown', LanguageDropdown.$trs);
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

  it('hides languages passed in excludeLanguages', async () => {
    renderComponent({ excludeLanguages: ['en'] });

    await userEvent.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: SPANISH })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: ENGLISH })).not.toBeInTheDocument();
  });

  it('clears the selection when the clear button is clicked', async () => {
    const { emitted } = renderComponent({ value: 'en' });

    await userEvent.click(screen.getByRole('button', { name: clearAction$() }));

    expect(lastInput(emitted)).toBeNull();
  });

  it('announces the removed option label, not a count, when clearing in single mode', async () => {
    renderComponent({ value: 'en' });

    await userEvent.click(screen.getByRole('button', { name: clearAction$() }));

    const liveRegion = document.querySelector('#k-live-region [aria-live="polite"]');
    expect(liveRegion).toHaveTextContent(optionRemovedLabel$({ label: ENGLISH }));
  });
});
