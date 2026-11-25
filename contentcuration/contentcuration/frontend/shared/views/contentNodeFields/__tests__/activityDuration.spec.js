import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import ActivityDuration from '../CompletionOptions/ActivityDuration';
import { CompletionDropdownMap, DurationDropdownMap } from 'shared/constants';
import { createTranslator } from 'shared/i18n';

const { minutesRequired$, optionalLabel$, notOptionalLabel$ } = createTranslator(
  'ActivityDuration',
  ActivityDuration.$trs,
);
const { SHORT_ACTIVITY, LONG_ACTIVITY, EXACT_TIME } = DurationDropdownMap;

function renderComponent(props = {}) {
  return render(ActivityDuration, { props, router: new VueRouter() });
}

async function getMinuteOptions(selectedDuration) {
  const user = userEvent.setup();
  renderComponent({ selectedDuration });
  await user.click(screen.getByRole('combobox', { name: minutesRequired$() }));
  return screen.getAllByRole('option').map(option => Number(option.textContent.trim()));
}

describe('ActivityDuration', () => {
  it('renders the minutes input', () => {
    renderComponent();
    expect(screen.getByRole('spinbutton', { name: minutesRequired$() })).toBeInTheDocument();
  });

  it('displays seconds from the parent as whole minutes', async () => {
    const { updateProps } = renderComponent({ value: 600 });
    expect(screen.getByRole('spinbutton', { name: minutesRequired$() })).toHaveValue(10);

    await updateProps({ value: 4821 });

    expect(screen.getByRole('spinbutton', { name: minutesRequired$() })).toHaveValue(80);
  });

  it('emits minutes entered in the number field as seconds', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent();

    await user.type(screen.getByRole('spinbutton', { name: minutesRequired$() }), '40');

    expect(emitted().input.slice(-1)[0]).toEqual([2400]);
  });

  describe.each([
    [SHORT_ACTIVITY, 5, 30, 5],
    [LONG_ACTIVITY, 40, 120, 10],
  ])('%s minutes', (selectedDuration, min, max, step) => {
    it('uses the activity increment', async () => {
      const options = await getMinuteOptions(selectedDuration);
      const increments = options.slice(1).map((value, index) => value - options[index]);

      expect(increments.length).toBeGreaterThan(0);
      expect(increments.every(increment => increment === step)).toBe(true);
    });

    it('uses the activity minimum', async () => {
      const options = await getMinuteOptions(selectedDuration);
      expect(Math.min(...options)).toBe(min);
    });

    it('uses the activity maximum', async () => {
      const options = await getMinuteOptions(selectedDuration);
      expect(Math.max(...options)).toBe(max);
    });
  });

  describe('completion hints', () => {
    it.each([SHORT_ACTIVITY, LONG_ACTIVITY])(
      'shows the optional hint for %s audio/video',
      selectedDuration => {
        renderComponent({ audioVideoUpload: true, selectedDuration });

        expect(screen.getByText(optionalLabel$())).toBeInTheDocument();
      },
    );

    it('hides hints for exact time on audio/video', () => {
      renderComponent({ selectedDuration: EXACT_TIME, audioVideoUpload: true });

      expect(screen.queryByText(optionalLabel$())).not.toBeInTheDocument();
      expect(screen.queryByText(notOptionalLabel$())).not.toBeInTheDocument();
    });

    it('shows the optional hint for short activity with all content viewed', () => {
      renderComponent({
        selectedDuration: SHORT_ACTIVITY,
        selectedCompletion: CompletionDropdownMap.allContent,
      });

      expect(screen.getByText(optionalLabel$())).toBeInTheDocument();
    });

    it('shows the required hint for short activity with complete duration', () => {
      renderComponent({
        selectedDuration: SHORT_ACTIVITY,
        selectedCompletion: CompletionDropdownMap.completeDuration,
      });

      expect(screen.getByText(notOptionalLabel$())).toBeInTheDocument();
      expect(screen.queryByText(optionalLabel$())).not.toBeInTheDocument();
    });

    it('hides hints for exact time on other resources', () => {
      renderComponent({ selectedDuration: EXACT_TIME });

      expect(screen.queryByText(optionalLabel$())).not.toBeInTheDocument();
      expect(screen.queryByText(notOptionalLabel$())).not.toBeInTheDocument();
    });
  });
});
