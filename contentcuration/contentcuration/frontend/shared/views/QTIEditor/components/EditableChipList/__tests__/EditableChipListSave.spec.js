import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Vue from 'vue';
import VueRouter from 'vue-router';
import EditableChipList from '../index.vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { stubProseMirrorLayout } from 'shared/utils/testing';
import { getTipTapEditorStrings } from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditorStrings';

// jsdom defines `ontouchstart`, which would put the editor in its touch layout.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));

const {
  distractorsLabel$,
  addDistractorBtn$,
  editDistractorLabel$,
  deleteDistractorBtn$,
  saveChipBtn$,
} = qtiEditorStrings;
const { TipTapEditorLabel$, insertImage$, closeModal$, textFormatOptions$ } =
  getTipTapEditorStrings();

const CHIPS = [
  { id: 'choice_a', content: '<p>Antonio</p>' },
  { id: 'choice_b', content: '<p>Prospero</p>' },
];

const LABELS = {
  addLabel: addDistractorBtn$(),
  listLabel: distractorsLabel$(),
  chipLabel: number => editDistractorLabel$({ number }),
  deleteLabel: number => deleteDistractorBtn$({ number }),
};

const Host = {
  components: { EditableChipList },
  template: `
    <EditableChipList
      :chips="chips"
      :addMode="addMode"
      v-bind="labels"
      @add-chip="html => chips.push({ id: 'choice_new', content: html })"
      @update-chip="(index, html) => chips.splice(index, 1, { ...chips[index], content: html })"
      @remove-chip="index => chips.splice(index, 1)"
    />
  `,
  props: {
    addMode: { type: String, default: 'button' },
    initialChips: { type: Array, default: () => CHIPS },
  },
  data() {
    return { chips: [...this.initialChips], labels: LABELS };
  },
};

const list = () => screen.getByRole('list', { name: distractorsLabel$() });
const chipTexts = () =>
  within(list())
    .queryAllByRole('listitem')
    .map(item => item.textContent.trim());
const button = name => screen.getByRole('button', { name });
const editButton = number => button(editDistractorLabel$({ number }));
const openEditor = () => screen.queryByRole('textbox', { name: TipTapEditorLabel$() });

async function writeIn(user, opener) {
  await user.click(opener);
  await waitFor(() => expect(openEditor()).toContainElement(document.activeElement));
  await user.keyboard('!');
}

describe('EditableChipList save', () => {
  stubProseMirrorLayout();

  let consoleError;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error');
  });

  afterEach(() => {
    try {
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  const renderHost = (addMode, initialChips) => {
    const user = userEvent.setup();
    render(Host, { props: { addMode, initialChips }, routes: new VueRouter() });
    return user;
  };

  describe.each(['button', 'region'])('in %s mode', addMode => {
    it('closes an open chip on a click on its save button, keeping the edit', async () => {
      const user = renderHost(addMode);
      await writeIn(user, editButton(2));

      await user.click(button(saveChipBtn$()));

      await waitFor(() => expect(editButton(2)).toHaveFocus());
      expect(openEditor()).toBeNull();
      expect(chipTexts()).toEqual(['Antonio', 'Prospero!']);
    });

    it('closes an open chip on Enter on its save button, keeping the edit', async () => {
      const user = renderHost(addMode);
      await writeIn(user, editButton(2));

      button(saveChipBtn$()).focus();
      await user.keyboard('{Enter}');

      await waitFor(() => expect(editButton(2)).toHaveFocus());
      expect(openEditor()).toBeNull();
      expect(chipTexts()).toEqual(['Antonio', 'Prospero!']);
    });

    it('closes and removes an open chip on a click on its delete button', async () => {
      const user = renderHost(addMode);
      await writeIn(user, editButton(2));

      await user.click(button(deleteDistractorBtn$({ number: 2 })));

      expect(openEditor()).toBeNull();
      expect(chipTexts()).toEqual(['Antonio']);
    });

    it('keeps an open chip open when its image dialog closes, and saves it after', async () => {
      const user = renderHost(addMode);
      await writeIn(user, editButton(2));

      await user.click(within(openEditor()).getByRole('button', { name: insertImage$() }));
      // A browser runs Vue's render between a native click's listeners, unmounting the
      // dialog before the click bubbles out of it; jsdom renders only after dispatch.
      const closeButton = await screen.findByRole('button', { name: closeModal$() });
      closeButton.addEventListener('click', () => closeButton.remove());
      await user.click(closeButton);

      expect(openEditor()).not.toBeNull();
      await user.click(button(saveChipBtn$()));

      await waitFor(() => expect(editButton(2)).toHaveFocus());
      expect(openEditor()).toBeNull();
      expect(chipTexts()).toEqual(['Antonio', 'Prospero!']);
    });

    describe.each([
      ['the gap beside the closed chips', list],
      ["the open chip's message line", () => document.querySelector('li.is-editing .is-reserved')],
    ])('on a click on %s', (_, target) => {
      it('closes an open chip, keeping the edit, without opening another', async () => {
        const user = renderHost(addMode);
        await writeIn(user, editButton(2));

        await user.click(target());

        await waitFor(() => expect(openEditor()).toBeNull());
        expect(chipTexts()).toEqual(['Antonio', 'Prospero!']);
      });

      it('only dismisses an open toolbar menu, keeping the chip open', async () => {
        const user = renderHost(addMode);
        await writeIn(user, editButton(2));
        const formatButton = within(openEditor()).getByRole('button', {
          name: textFormatOptions$(),
        });
        await user.click(formatButton);
        await waitFor(() => expect(formatButton).toHaveAttribute('aria-expanded', 'true'));

        await user.click(target());

        await waitFor(() => expect(formatButton).toHaveAttribute('aria-expanded', 'false'));
        expect(openEditor()).not.toBeNull();
      });
    });

    describe('with a blank chip open', () => {
      const BLANK_SECOND = [
        { id: 'choice_a', content: '<p>Antonio</p>' },
        { id: 'choice_b', content: '' },
        { id: 'choice_c', content: '<p>Caliban</p>' },
        { id: 'choice_d', content: '<p>Miranda</p>' },
      ];

      const openBlank = async addMode => {
        const user = renderHost(addMode, BLANK_SECOND);
        await user.click(editButton(2));
        await waitFor(() => expect(openEditor()).toContainElement(document.activeElement));
        return user;
      };

      it('removes only it on a click on its delete button', async () => {
        const user = await openBlank(addMode);

        await user.click(button(deleteDistractorBtn$({ number: 2 })));

        expect(openEditor()).toBeNull();
        expect(chipTexts()).toEqual(['Antonio', 'Caliban', 'Miranda']);
      });

      it('removes a later chip whose delete button is clicked', async () => {
        const user = await openBlank(addMode);

        await user.click(button(deleteDistractorBtn$({ number: 3 })));

        expect(openEditor()).toBeNull();
        expect(chipTexts()).toEqual(['Antonio', 'Miranda']);
      });

      it('opens the chip that is clicked', async () => {
        const user = await openBlank(addMode);

        await user.click(editButton(3));

        await waitFor(() => expect(openEditor()).toHaveTextContent('Caliban'));
        expect(chipTexts()).toHaveLength(3);
      });
    });

    it('throws a written draft away on a click on its discard button', async () => {
      const user = renderHost(addMode);
      await writeIn(user, button(addDistractorBtn$()));

      await user.click(button(deleteDistractorBtn$({ number: 3 })));

      expect(openEditor()).toBeNull();
      expect(chipTexts()).toEqual(['Antonio', 'Prospero']);
    });
  });

  it('adds a region-mode draft on save without opening another', async () => {
    const user = renderHost('region');
    await writeIn(user, button(addDistractorBtn$()));

    await user.click(button(saveChipBtn$()));

    await waitFor(() => expect(button(addDistractorBtn$())).toHaveFocus());
    expect(openEditor()).toBeNull();
    expect(chipTexts()).toEqual(['Antonio', 'Prospero', '!']);
  });

  describe('in region mode, rendering between listeners as a browser does', () => {
    beforeEach(() => {
      Vue.config.async = false;
    });

    afterEach(() => {
      Vue.config.async = true;
    });

    it.each([
      ['a chip', () => editButton(2), () => document.querySelector('.pool-content')],
      ['a draft', () => button(addDistractorBtn$()), () => document.querySelector('.pool-content')],
      ['a draft', () => button(addDistractorBtn$()), list],
    ])('closes %s on a click in the box without opening a draft', async (_, opener, target) => {
      const user = renderHost('region');
      await writeIn(user, opener());

      await user.click(target());

      expect(openEditor()).toBeNull();
    });
  });

  it('adds a draft on a save click that moves no focus', async () => {
    const user = renderHost('region');
    await writeIn(user, button(addDistractorBtn$()));

    await fireEvent.click(button(saveChipBtn$()));

    expect(openEditor()).toBeNull();
    await waitFor(() => expect(chipTexts()).toEqual(['Antonio', 'Prospero', '!']));
  });
});
