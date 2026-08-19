import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import CategoryOptions from '../CategoryOptions.vue';
import { commonStrings } from 'shared/strings/commonStrings';
import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
import { metadataTranslationMixin } from 'shared/mixins';

const { translateMetadataString } = metadataTranslationMixin.methods;
const { openMenuAction$ } = commonStrings;
const { clearAllAction$ } = communityChannelsStrings;

const SCHOOL = 'd&WXdXWF';
const ARTS = 'd&WXdXWF.5QAjgfv7';
const DANCE = 'd&WXdXWF.5QAjgfv7.BUMJJBnS';
const MUSIC = 'd&WXdXWF.5QAjgfv7.u0aKjT4i';

const SCHOOL_LABEL = translateMetadataString('school');
const ARTS_LABEL = translateMetadataString('arts');
const DANCE_LABEL = translateMetadataString('dance');
const MUSIC_LABEL = translateMetadataString('music');
const DANCE_PATH = `${SCHOOL_LABEL} - ${ARTS_LABEL} - ${DANCE_LABEL}`;
const ARTS_PATH = `${SCHOOL_LABEL} - ${ARTS_LABEL}`;

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
    expect(screen.getByText(translateMetadataString('category'))).toBeInTheDocument();
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
      // getAllByText because KChip nests two elements that both carry the chip text.
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
      const { emitted } = renderComponent();

      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(await screen.findByRole('option', { name: SCHOOL_LABEL }));

      expect(lastInput(emitted)).toEqual({
        [SCHOOL]: [NODE_1],
      });
    });

    it('adds only the parent when a partially selected parent is clicked', async () => {
      const { emitted } = renderComponent({ value: { [DANCE]: [NODE_1] } });

      await userEvent.click(screen.getByRole('combobox'));
      // An indeterminate option's accessible name includes the hidden
      // "partially selected" text, so match on how the name starts.
      await userEvent.click(
        await screen.findByRole('option', { name: name => name.startsWith(SCHOOL_LABEL) }),
      );

      expect(lastInput(emitted)).toEqual({
        [DANCE]: [NODE_1],
        [SCHOOL]: [NODE_1],
      });
    });

    it('removes a category when its chip close button is clicked', async () => {
      const { emitted } = renderComponent({ value: { [DANCE]: [NODE_1] } });

      await userEvent.click(screen.getByRole('button', { name: `Remove ${DANCE_PATH}` }));

      expect(lastInput(emitted)).toEqual({});
    });

    it('removes stored descendants when a parent chip is removed', async () => {
      const { emitted } = renderComponent({
        value: { [ARTS]: [NODE_1], [DANCE]: [NODE_1] },
      });

      await userEvent.click(screen.getByRole('button', { name: `Remove ${ARTS_PATH}` }));

      expect(lastInput(emitted)).toEqual({});
    });

    it('emits an empty object when the selection is cleared', async () => {
      const { emitted } = renderComponent({ value: { [DANCE]: [NODE_1] } });

      await userEvent.click(screen.getByRole('button', { name: clearAllAction$() }));

      expect(lastInput(emitted)).toEqual({});
    });
  });

  describe('expanded mode', () => {
    it('renders the flat checkbox list instead of KMultiSelect', () => {
      renderComponent({ expanded: true });

      expect(screen.queryByRole('button', { name: openMenuAction$() })).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: DANCE_LABEL })).toBeInTheDocument();
    });

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
