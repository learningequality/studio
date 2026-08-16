import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import CategoryOptions from '../CategoryOptions.vue';

const SCHOOL = 'd&WXdXWF';
const ARTS = 'd&WXdXWF.5QAjgfv7';
const DANCE = 'd&WXdXWF.5QAjgfv7.BUMJJBnS';
const MUSIC = 'd&WXdXWF.5QAjgfv7.u0aKjT4i';

const SCHOOL_LABEL = 'School';
const ARTS_LABEL = 'Arts';
const DANCE_LABEL = 'Dance';
const MUSIC_LABEL = 'Music';
const DANCE_PATH = 'School - Arts - Dance';

const NODE_1 = 'node1';
const NODE_2 = 'node2';

function renderComponent({ value = {}, nodeIds = [NODE_1], expanded = false } = {}) {
  return render(CategoryOptions, {
    props: { value, nodeIds, expanded },
    routes: new VueRouter(),
  });
}

function lastInput(emitted) {
  const events = emitted().input;
  return events[events.length - 1][0];
}

describe('CategoryOptions', () => {
  it('renders the category field', () => {
    renderComponent();
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  describe('dropdown mode (KMultiSelect)', () => {
    it('shows a chip only for categories applied to every edited node', () => {
      renderComponent({
        value: {
          [DANCE]: [NODE_1, NODE_2],
          [MUSIC]: [NODE_1],
        },
        nodeIds: [NODE_1, NODE_2],
      });

      // The closed dropdown stays in the DOM (v-show), so queries must not look inside it.
      const chipsArea = within(screen.getByRole('group'));
      expect(chipsArea.getAllByText(DANCE_LABEL).length).toBeGreaterThan(0);
      expect(chipsArea.queryByText(MUSIC_LABEL)).not.toBeInTheDocument();
    });

    it('shows the full category path in the chip tooltip', async () => {
      renderComponent({ value: { [DANCE]: [NODE_1] } });

      expect(await screen.findByText(DANCE_PATH)).toBeInTheDocument();
    });

    it('renders parent categories as named groups in the dropdown', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('combobox'));

      const school = await screen.findByRole('group', { name: SCHOOL_LABEL });
      expect(within(school).getByRole('option', { name: DANCE_LABEL })).toBeInTheDocument();
    });

    it('emits the selection as an object applying each category to all edited nodes', async () => {
      const { emitted } = renderComponent({ nodeIds: [NODE_1, NODE_2] });

      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(await screen.findByRole('option', { name: SCHOOL_LABEL }));

      expect(lastInput(emitted)).toEqual({
        [SCHOOL]: [NODE_1, NODE_2],
      });
    });

    it('preserves partially applied categories when the selection changes', async () => {
      const { emitted } = renderComponent({
        value: { [MUSIC]: [NODE_1] },
        nodeIds: [NODE_1, NODE_2],
      });

      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(await screen.findByRole('option', { name: SCHOOL_LABEL }));

      expect(lastInput(emitted)).toEqual({
        [MUSIC]: [NODE_1],
        [SCHOOL]: [NODE_1, NODE_2],
      });
    });

    it('removes a category when its chip close button is clicked', async () => {
      const { emitted } = renderComponent({ value: { [DANCE]: [NODE_1] } });

      await userEvent.click(screen.getByRole('button', { name: `Remove ${DANCE_LABEL}` }));

      expect(lastInput(emitted)).toEqual({});
    });

    it('emits an empty object when the selection is cleared', async () => {
      const { emitted } = renderComponent({ value: { [DANCE]: [NODE_1] } });

      await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));

      expect(lastInput(emitted)).toEqual({});
    });

    it('renders the flat checkbox list instead of KMultiSelect in expanded mode', () => {
      renderComponent({ expanded: true });

      expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument();
      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    });
  });

  describe('expanded mode', () => {
    it('emits the added category applied to all edited nodes when checked', async () => {
      const { emitted } = renderComponent({ expanded: true, nodeIds: [NODE_1] });

      await userEvent.click(screen.getByRole('checkbox', { name: DANCE_LABEL }));

      expect(lastInput(emitted)).toEqual({ [DANCE]: [NODE_1] });
    });

    it('removes a category and its stored descendants when unchecked', async () => {
      const { emitted } = renderComponent({
        expanded: true,
        value: { [ARTS]: [NODE_1], [DANCE]: [NODE_1] },
        nodeIds: [NODE_1],
      });

      await userEvent.click(screen.getByRole('checkbox', { name: ARTS_LABEL }));

      expect(lastInput(emitted)).toEqual({});
    });
  });
});
