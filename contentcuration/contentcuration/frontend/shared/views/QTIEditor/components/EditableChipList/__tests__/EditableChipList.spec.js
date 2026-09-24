import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import EditableChipList from '../index.vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');

const {
  distractorsLabel$,
  addDistractorBtn$,
  editDistractorLabel$,
  deleteDistractorBtn$,
  errorEmptyChoiceContent$,
  saveChipBtn$,
} = qtiEditorStrings;

const CHIPS = [
  { id: 'choice_a', content: 'Antonio' },
  { id: 'choice_b', content: 'Prospero' },
  { id: 'choice_c', content: 'Capulet' },
];

const LABELS = {
  addLabel: addDistractorBtn$(),
  listLabel: distractorsLabel$(),
  chipLabel: number => editDistractorLabel$({ number }),
  deleteLabel: number => deleteDistractorBtn$({ number }),
};

const renderList = (props = {}) =>
  render(EditableChipList, {
    props: { chips: CHIPS, ...LABELS, ...props },
    routes: new VueRouter(),
  });

// Applies every emit to its own data, the way an editor does, and closes the
// list the way an editor does when another editor opens.
const Host = {
  components: { EditableChipList },
  template: `
    <div>
      <EditableChipList
        ref="list"
        :chips="chips"
        :addMode="addMode"
        :minChips="minChips"
        :errorMessages="errorMessages"
        v-bind="labels"
        @add-chip="html => chips.push({ id: 'choice_new', content: html })"
        @update-chip="(index, html) => chips.splice(index, 1, { ...chips[index], content: html })"
        @remove-chip="index => chips.splice(index, 1)"
      />
      <button @click="$refs.list.close()">Elsewhere</button>
    </div>
  `,
  props: {
    initialChips: { type: Array, default: () => CHIPS },
    addMode: { type: String, default: 'button' },
    minChips: { type: Number, default: 0 },
    errorMessages: { type: Array, default: () => [] },
  },
  data() {
    return { chips: [...this.initialChips], labels: LABELS };
  },
};

const renderHost = (props = {}) => render(Host, { props, routes: new VueRouter() });

const list = () => screen.getByRole('list', { name: distractorsLabel$() });
const chipItems = () => within(list()).queryAllByRole('listitem');
const chipTexts = () => chipItems().map(item => item.textContent.trim());
const button = name => screen.getByRole('button', { name });
const queryButton = name => screen.queryByRole('button', { name });
const openTextarea = () => screen.queryAllByRole('textbox').find(el => el.tagName === 'TEXTAREA');
const closeFromElsewhere = user => user.click(button('Elsewhere'));

describe('EditableChipList', () => {
  describe('button mode', () => {
    it('lists each chip in the named list', () => {
      renderList();
      expect(chipTexts()).toEqual(['Antonio', 'Prospero', 'Capulet']);
    });

    it('opens a chip in place of its edit button, and reports its edits', async () => {
      const user = userEvent.setup();
      const { emitted } = renderList();
      await user.click(button(editDistractorLabel$({ number: 2 })));
      expect(emitted().open).toHaveLength(1);
      expect(queryButton(editDistractorLabel$({ number: 2 }))).not.toBeInTheDocument();
      expect(within(chipItems()[1]).getByRole('textbox')).toHaveValue('Prospero');

      await user.type(openTextarea(), '!');
      expect(emitted()['update-chip'].at(-1)).toEqual([1, 'Prospero!']);
    });

    it('asks to remove a chip without also opening it', async () => {
      const user = userEvent.setup();
      const { emitted } = renderList();
      await user.click(button(deleteDistractorBtn$({ number: 3 })));
      expect(emitted()['remove-chip']).toEqual([[2]]);
      expect(emitted().open).toBeUndefined();
    });

    it('writes a new chip outside the list, adding nothing until it is saved', async () => {
      const user = userEvent.setup();
      renderHost();
      await user.click(button(addDistractorBtn$()));
      expect(within(list()).queryByRole('textbox')).not.toBeInTheDocument();
      await user.type(openTextarea(), 'Montague');
      expect(chipTexts()).toHaveLength(3);

      await user.click(button(saveChipBtn$()));
      expect(chipTexts().at(-1)).toBe('Montague');
      expect(openTextarea()).toBeUndefined();
    });

    it('adds the written chip when its editor is closed without saving', async () => {
      const user = userEvent.setup();
      renderHost();
      await user.click(button(addDistractorBtn$()));
      await user.type(openTextarea(), 'Montague');
      await closeFromElsewhere(user);
      expect(chipTexts().at(-1)).toBe('Montague');
      expect(openTextarea()).toBeUndefined();
    });

    it('adds nothing when a new chip is closed blank', async () => {
      const user = userEvent.setup();
      renderHost();
      await user.click(button(addDistractorBtn$()));
      await user.click(button(saveChipBtn$()));
      expect(chipTexts()).toHaveLength(3);
    });

    it('throws a written chip away when its discard button is pressed', async () => {
      const user = userEvent.setup();
      const { emitted } = renderList();
      await user.click(button(addDistractorBtn$()));
      await user.type(openTextarea(), 'x');
      await user.click(button(deleteDistractorBtn$({ number: 4 })));
      expect(openTextarea()).toBeUndefined();
      expect(emitted()['add-chip']).toBeUndefined();
      expect(emitted().close).toHaveLength(1);
    });

    it('commits the written chip and leaves a fresh, focused editor on a second add press', async () => {
      const user = userEvent.setup();
      renderHost();
      await user.click(button(addDistractorBtn$()));
      await user.type(openTextarea(), 'Montague');
      await user.click(button(addDistractorBtn$()));
      expect(within(list()).getByText('Montague')).toBeInTheDocument();
      expect(openTextarea()).toHaveValue('');
      expect(openTextarea()).toHaveFocus();
    });

    it('drops a chip left blank when its editor closes', async () => {
      const user = userEvent.setup();
      renderHost({ initialChips: [...CHIPS, { id: 'choice_d', content: '' }] });
      await user.click(button(editDistractorLabel$({ number: 4 })));
      await closeFromElsewhere(user);
      expect(chipTexts()).toEqual(['Antonio', 'Prospero', 'Capulet']);
    });

    it('opens the chip clicked after a blank one drops out ahead of it', async () => {
      const user = userEvent.setup();
      renderHost({ initialChips: [{ id: 'choice_d', content: '' }, ...CHIPS] });
      await user.click(button(editDistractorLabel$({ number: 1 })));
      await user.click(button(editDistractorLabel$({ number: 3 })));
      expect(chipItems()).toHaveLength(3);
      expect(within(chipItems()[1]).getByRole('textbox')).toHaveValue('Prospero');
    });

    it('shows each error message under its own chip only', () => {
      renderList({ errorMessages: [null, errorEmptyChoiceContent$(), null] });
      const [first, second, third] = chipItems();
      expect(within(second).getByText(errorEmptyChoiceContent$())).toBeInTheDocument();
      expect(within(first).queryByText(errorEmptyChoiceContent$())).not.toBeInTheDocument();
      expect(within(third).queryByText(errorEmptyChoiceContent$())).not.toBeInTheDocument();
    });

    it('holds an open chip’s error until it closes', async () => {
      const user = userEvent.setup();
      renderHost({
        initialChips: [{ id: 'choice_d', content: '' }],
        minChips: 1,
        errorMessages: [errorEmptyChoiceContent$()],
      });
      await user.click(button(editDistractorLabel$({ number: 1 })));
      expect(screen.queryByText(errorEmptyChoiceContent$())).not.toBeInTheDocument();

      await closeFromElsewhere(user);
      expect(screen.getByText(errorEmptyChoiceContent$())).toBeInTheDocument();
    });

    it('shows the placeholder in a blank chip only', () => {
      renderList({
        chips: [CHIPS[0], { id: 'choice_d', content: '' }],
        placeholder: 'Write here',
      });
      const [written, blank] = chipItems();
      expect(within(blank).getByText('Write here')).toBeInTheDocument();
      expect(within(written).queryByText('Write here')).not.toBeInTheDocument();
    });
  });

  describe('keeping a minimum', () => {
    it('disables every remove button once the list is down to its minimum', () => {
      renderList({ chips: [CHIPS[0]], minChips: 1 });
      expect(button(deleteDistractorBtn$({ number: 1 }))).toBeDisabled();
    });

    it('keeps a chip left blank when it is the last one the list must keep', async () => {
      const user = userEvent.setup();
      renderHost({ initialChips: [{ id: 'choice_d', content: '' }], minChips: 1 });
      await user.click(button(editDistractorLabel$({ number: 1 })));
      await closeFromElsewhere(user);
      expect(chipItems()).toHaveLength(1);
    });

    it('focuses the add control once the list reaches its minimum', async () => {
      const user = userEvent.setup();
      renderHost({ initialChips: CHIPS.slice(0, 2), minChips: 1 });
      await user.click(button(deleteDistractorBtn$({ number: 1 })));
      expect(chipTexts()).toEqual(['Prospero']);
      expect(button(addDistractorBtn$())).toHaveFocus();
    });
  });

  describe('focus', () => {
    it('focuses the delete button of the chip taking a removed chip’s place', async () => {
      const user = userEvent.setup();
      renderHost();
      await user.click(button(deleteDistractorBtn$({ number: 2 })));
      expect(screen.queryByText('Prospero')).not.toBeInTheDocument();
      // Capulet now sits second.
      expect(button(deleteDistractorBtn$({ number: 2 }))).toHaveFocus();
    });

    it('focuses the add button when the last chip is removed', async () => {
      const user = userEvent.setup();
      renderHost({ initialChips: [CHIPS[0]] });
      await user.click(button(deleteDistractorBtn$({ number: 1 })));
      expect(chipItems()).toHaveLength(0);
      expect(button(addDistractorBtn$())).toHaveFocus();
    });

    it('focuses the add button when the new chip is discarded', async () => {
      const user = userEvent.setup();
      renderHost();
      await user.click(button(addDistractorBtn$()));
      await user.click(button(deleteDistractorBtn$({ number: 4 })));
      expect(openTextarea()).toBeUndefined();
      expect(button(addDistractorBtn$())).toHaveFocus();
    });

    it('focuses the add button when the new chip is saved', async () => {
      const user = userEvent.setup();
      renderHost();
      await user.click(button(addDistractorBtn$()));
      await user.type(openTextarea(), 'Montague');
      await user.click(button(saveChipBtn$()));
      expect(button(addDistractorBtn$())).toHaveFocus();
    });
  });

  describe('region mode', () => {
    const region = () => button(addDistractorBtn$());
    const queryRegion = () => queryButton(addDistractorBtn$());

    it('makes the box itself the add control, with no add button', () => {
      renderList({ addMode: 'region' });
      expect(region()).toBeInTheDocument();
      // The add button shows its label as text; the region only names itself.
      expect(screen.queryByText(addDistractorBtn$())).not.toBeInTheDocument();
    });

    it('opens a new chip when the empty area of the list is clicked', async () => {
      const user = userEvent.setup();
      const { emitted } = renderList({ addMode: 'region' });
      await user.click(list());
      expect(emitted().open).toHaveLength(1);
      expect(openTextarea()).toHaveValue('');
    });

    it('opens a new chip when Enter is pressed on the region', async () => {
      const user = userEvent.setup();
      renderList({ addMode: 'region' });
      region().focus();
      await user.keyboard('{Enter}');
      expect(openTextarea()).toHaveValue('');
    });

    it('opens only the chip when the chip is clicked', async () => {
      const user = userEvent.setup();
      renderList({ addMode: 'region' });
      await user.click(button(editDistractorLabel$({ number: 1 })));
      expect(openTextarea()).toHaveValue('Antonio');
    });

    it('asks only to remove a chip when its delete button is clicked', async () => {
      const user = userEvent.setup();
      const { emitted } = renderList({ addMode: 'region' });
      await user.click(button(deleteDistractorBtn$({ number: 1 })));
      expect(emitted()['remove-chip']).toEqual([[0]]);
      expect(openTextarea()).toBeUndefined();
    });

    it('turns the region off while one of its editors is open', async () => {
      const user = userEvent.setup();
      renderList({ addMode: 'region' });
      await user.click(list());
      expect(queryRegion()).not.toBeInTheDocument();
      await user.click(list());
      expect(openTextarea()).toHaveValue('');
    });

    it('opens no new chip on a click inside an open chip', async () => {
      const user = userEvent.setup();
      renderList({ addMode: 'region' });
      await user.click(button(editDistractorLabel$({ number: 1 })));
      await user.click(openTextarea());
      expect(openTextarea()).toHaveValue('Antonio');
    });

    it('focuses the region when the last chip is removed', async () => {
      const user = userEvent.setup();
      renderHost({ initialChips: [CHIPS[0]], addMode: 'region' });
      await user.click(button(deleteDistractorBtn$({ number: 1 })));
      expect(chipItems()).toHaveLength(0);
      expect(region()).toHaveFocus();
    });

    it('focuses the region when the new chip is discarded', async () => {
      const user = userEvent.setup();
      renderHost({ addMode: 'region' });
      await user.click(list());
      await user.click(button(deleteDistractorBtn$({ number: 4 })));
      expect(openTextarea()).toBeUndefined();
      expect(region()).toHaveFocus();
    });
  });
});
