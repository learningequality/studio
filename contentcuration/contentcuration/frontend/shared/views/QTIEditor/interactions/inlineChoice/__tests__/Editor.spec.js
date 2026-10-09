import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import InlineChoiceEditor from '../Editor.vue';
import { inlineChoiceInteractionDescriptor as descriptor } from '../Descriptor';
import { getDropdowns } from '../parse';
import { QuestionType } from '../../../constants';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';
import { CHIP, chip } from './renderPassage';
import { dragSortStrings as dragTr } from 'shared/views/dragSort/dragSortStrings';
import { getTipTapEditorStrings } from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditorStrings';
import { stubProseMirrorLayout } from 'shared/utils/testing';

// jsdom defines `ontouchstart`, which would put the editor in its touch layout.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});
// `useDraggableUniverse` destructures this composable, so the automock has to return a
// usable object rather than undefined.
jest.mock('kolibri-design-system/lib/composables/useKLiveRegion', () => ({
  __esModule: true,
  default: () => ({ sendPoliteMessage: jest.fn(), sendAssertiveMessage: jest.fn() }),
}));

const PASSAGE = `<p>The Earth ${chip('r1', [
  ['sun', 'Sun'],
  ['moon', 'Moon'],
  ['stars', 'Stars'],
])} orbits, and ${chip('r2', [['revolves', 'revolves']], 'revolves')} too.</p>`;

const interactionOf = state =>
  descriptor.buildXML(
    { prompt: '<p>Pick the words</p>', passage: PASSAGE, shuffle: false, ...state },
    QuestionType.INLINE_CHOICE,
  );

let teleportTarget;

beforeEach(() => {
  teleportTarget = document.createElement('div');
  teleportTarget.id = 'settings-target';
  document.body.appendChild(teleportTarget);
});

afterEach(() => {
  teleportTarget.remove();
});

async function renderEditor(props = {}) {
  const user = userEvent.setup();
  const rendered = render(InlineChoiceEditor, {
    props: {
      interaction: interactionOf(),
      questionType: QuestionType.INLINE_CHOICE,
      mode: 'edit',
      teleportTargetId: 'settings-target',
      ...props,
    },
    routes: new VueRouter(),
  });
  if (props.mode === 'view') {
    await waitFor(() =>
      expect(screen.getAllByRole('img', { name: /answer dropdown/i })).not.toHaveLength(0),
    );
  } else {
    // The card opens on its question; the chips take a click once the passage is open.
    await user.click(await screen.findByRole('button', { name: tr.editPassageLabel$() }));
    await waitFor(() => expect(screen.getAllByRole('button', CHIP)).not.toHaveLength(0));
  }
  return { ...rendered, user };
}

const chips = () => screen.getAllByRole('button', CHIP);
const dialog = () => screen.getByRole('dialog');
const optionInputs = () => within(dialog()).getAllByRole('textbox', { name: /^Option \d+$/ });
const optionLabel = number => tr.inlineChoiceOptionLabel$({ number });
/** The part of the editor under the heading with that name: its field, help and errors. */
const section = name => screen.getByRole('heading', { name }).parentElement;

/** The dropdowns of the last interaction the editor emitted, as saved and read back. */
function savedDropdowns(emitted) {
  const [interaction] = emitted['update:interaction'].at(-1);
  const state = descriptor.parse(interaction.bodyXml, interaction.responseDeclarations);
  return getDropdowns(state.passage);
}

async function openChip(user, index) {
  await user.click(chips()[index]);
  return screen.findByRole('dialog');
}

describe('InlineChoiceEditor', () => {
  stubProseMirrorLayout();

  // jsdom lays nothing out, so every element would read as hidden to the focus helpers.
  let offsetParent;
  beforeAll(() => {
    offsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return this.parentNode;
      },
    });
  });
  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParent);
  });

  it('shows the optional question and the passage editor with its helper text', async () => {
    await renderEditor();
    expect(
      within(section(tr.questionOptionalLabel$())).getByText('Pick the words'),
    ).toBeInTheDocument();
    const passage = within(section(tr.passageEditorLabel$()));
    expect(passage.getByText(tr.passageEditorDescription$())).toBeInTheDocument();
    expect(passage.getByRole('button', { name: tr.insertInlineChoice$() })).toBeInTheDocument();
    expect(passage.getAllByRole('button', CHIP)).toHaveLength(2);
  });

  it('describes the passage editor with its helper text', async () => {
    await renderEditor();
    const passage = section(tr.passageEditorLabel$()).querySelector('.ProseMirror');
    expect(passage).toHaveAccessibleDescription(tr.passageEditorDescription$());
  });

  it('opens on the question, focused, with the passage closed', async () => {
    render(InlineChoiceEditor, {
      props: {
        interaction: interactionOf(),
        questionType: QuestionType.INLINE_CHOICE,
        mode: 'edit',
        teleportTargetId: 'settings-target',
      },
      routes: new VueRouter(),
    });
    const editPassage = await screen.findByRole('button', { name: tr.editPassageLabel$() });
    await waitFor(() =>
      expect(screen.getByText('Pick the words').closest('.ProseMirror')).toHaveFocus(),
    );
    expect(
      screen.queryByRole('button', { name: tr.insertInlineChoice$() }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', CHIP)).not.toBeInTheDocument();
    expect(editPassage).toBeInTheDocument();
  });

  it('shows no options panel until a chip is opened', async () => {
    await renderEditor();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('opening a chip', () => {
    it('shows its options in a modal dialog named after it', async () => {
      const { user } = await renderEditor();
      const panel = await openChip(user, 0);

      expect(panel).toHaveAttribute('aria-modal', 'true');
      expect(panel).toHaveAccessibleName(tr.inlineChoiceOptionsDialogLabel$({ number: 1 }));
      expect(optionInputs().map(input => input.value)).toEqual(['Sun', 'Moon', 'Stars']);
      expect(chips()[0]).toHaveAttribute('aria-expanded', 'true');
    });

    it('moves focus into its options list', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      await waitFor(() => expect(optionInputs()[0]).toHaveFocus());
    });

    it('opens with Enter on the chip', async () => {
      const { user } = await renderEditor();
      // The passage opens focused; wait for that before moving to the chip.
      await waitFor(() => expect(document.activeElement).toHaveClass('ProseMirror'));
      chips()[1].focus();
      await user.keyboard('{Enter}');
      await screen.findByRole('dialog');
      expect(optionInputs().map(input => input.value)).toEqual(['revolves']);
    });

    it('shows the other chip’s options when another chip is opened', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      await openChip(user, 1);

      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(dialog()).toHaveAccessibleName(tr.inlineChoiceOptionsDialogLabel$({ number: 2 }));
      expect(optionInputs().map(input => input.value)).toEqual(['revolves']);
    });
  });

  describe('editing options', () => {
    it('edits an option’s text, which the chip label and the saved item follow', async () => {
      const { emitted, user } = await renderEditor();
      await openChip(user, 1);
      const [input] = optionInputs();
      await user.clear(input);
      await user.type(input, 'spins');

      expect(input).toHaveValue('spins');
      expect(chips()[1]).toHaveTextContent('spins');
      expect(savedDropdowns(emitted())[1].options).toEqual([{ id: 'revolves', text: 'spins' }]);
    });

    it('adds an option, updating the chip count, and focuses it', async () => {
      const { emitted, user } = await renderEditor();
      await openChip(user, 1);
      await user.click(screen.getByRole('button', { name: tr.addInlineChoiceOptionBtn$() }));

      expect(optionInputs()).toHaveLength(2);
      await waitFor(() => expect(optionInputs()[1]).toHaveFocus());
      await user.keyboard('rotates');
      expect(chips()[1]).toHaveTextContent(/^2/);
      expect(savedDropdowns(emitted())[1].options.map(o => o.text)).toEqual([
        'revolves',
        'rotates',
      ]);
    });

    it('removes an option', async () => {
      const { emitted, user } = await renderEditor();
      await openChip(user, 0);
      await user.click(
        screen.getByRole('button', { name: tr.deleteInlineChoiceOptionBtn$({ number: 2 }) }),
      );

      expect(optionInputs().map(input => input.value)).toEqual(['Sun', 'Stars']);
      // The chip needs a correct answer, so its count is in its name, beside the error icon.
      expect(chips()[0]).toHaveAccessibleName(/2 options/);
      expect(savedDropdowns(emitted())[0].options.map(o => o.text)).toEqual(['Sun', 'Stars']);
    });

    it('keeps focus in the panel on the option that takes a removed one’s place', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      const remove = number =>
        screen.getByRole('button', { name: tr.deleteInlineChoiceOptionBtn$({ number }) });

      remove(2).focus();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(optionInputs()[1]).toHaveFocus());
      expect(optionInputs()[1]).toHaveValue('Stars');

      remove(2).focus();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(optionInputs()[0]).toHaveFocus());
      expect(optionInputs()[0]).toHaveValue('Sun');
    });

    it('disables removing a chip’s only option', async () => {
      const { user } = await renderEditor();
      await openChip(user, 1);
      const remove = screen.getByRole('button', {
        name: tr.deleteInlineChoiceOptionBtn$({ number: 1 }),
      });
      expect(remove).toBeDisabled();
    });

    it('marks exactly one option correct, and the chip shows it', async () => {
      const { emitted, user } = await renderEditor();
      await openChip(user, 0);
      const radio = number =>
        screen.getByRole('radio', { name: tr.markInlineChoiceOptionCorrect$({ number }) });

      await user.click(radio(2));
      expect(radio(2)).toBeChecked();
      expect(chips()[0]).toHaveTextContent('Moon');

      await user.click(radio(3));
      expect(radio(2)).not.toBeChecked();
      expect(radio(3)).toBeChecked();
      expect(chips()[0]).toHaveTextContent('Stars');
      expect(savedDropdowns(emitted())[0].correctId).toBe('stars');
    });

    it('keeps the correct mark on the same option when it moves', async () => {
      const { emitted, user } = await renderEditor();
      await openChip(user, 1);
      await user.click(screen.getByRole('button', { name: tr.addInlineChoiceOptionBtn$() }));
      await user.keyboard('rotates');
      await user.click(
        screen.getByRole('button', {
          name: dragTr.$tr('moveItemDownLabel', { item: optionLabel(1) }),
        }),
      );

      expect(optionInputs().map(input => input.value)).toEqual(['rotates', 'revolves']);
      expect(
        screen.getByRole('radio', { name: tr.markInlineChoiceOptionCorrect$({ number: 2 }) }),
      ).toBeChecked();
      const [, dropdown] = savedDropdowns(emitted());
      expect(dropdown.options.map(o => o.text)).toEqual(['rotates', 'revolves']);
      expect(dropdown.correctId).toBe('revolves');
    });

    it('leaves the chip with no correct answer when the correct option is removed', async () => {
      const { emitted, user } = await renderEditor();
      await openChip(user, 1);
      await user.click(screen.getByRole('button', { name: tr.addInlineChoiceOptionBtn$() }));
      await user.click(
        screen.getByRole('button', { name: tr.deleteInlineChoiceOptionBtn$({ number: 1 }) }),
      );

      expect(chips()[1]).toHaveTextContent(tr.addAnswers$());
      expect(savedDropdowns(emitted())[1].correctId).toBeNull();
    });

    it('restores the list when the edit is undone in the passage', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      await user.click(
        screen.getByRole('button', { name: tr.deleteInlineChoiceOptionBtn$({ number: 1 }) }),
      );
      expect(optionInputs().map(input => input.value)).toEqual(['Moon', 'Stars']);

      // A press on the passage's toolbar closes the panel.
      const { undo$, redo$ } = getTipTapEditorStrings();
      await user.click(screen.getByRole('button', { name: undo$() }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await openChip(user, 0);
      expect(optionInputs().map(input => input.value)).toEqual(['Sun', 'Moon', 'Stars']);

      await user.click(screen.getByRole('button', { name: redo$() }));
      await openChip(user, 0);
      expect(optionInputs().map(input => input.value)).toEqual(['Moon', 'Stars']);
    });

    it('undoes and redoes an option’s text with the passage’s history alone', async () => {
      const { user } = await renderEditor();
      await openChip(user, 1);
      const [input] = optionInputs();
      await user.type(input, 's');
      expect(input).toHaveValue('revolvess');

      // What the browser's Edit menu sends; true when the field's own history was kept out.
      async function historyInput(inputType) {
        const event = new InputEvent('beforeinput', { inputType, cancelable: true });
        await fireEvent(input, event);
        return event.defaultPrevented;
      }
      expect(await historyInput('historyUndo')).toBe(true);
      expect(input).toHaveValue('revolves');
      expect(chips()[1]).toHaveTextContent('revolves');
      expect(input).toHaveFocus();

      // The undo was not recorded as an edit, for a second one to type it back.
      await historyInput('historyUndo');
      expect(input).toHaveValue('revolves');

      expect(await historyInput('historyRedo')).toBe(true);
      expect(input).toHaveValue('revolvess');
    });

    // The field's own redo never has anything to redo, as its undo never runs, so the browser
    // sends no `historyRedo` for these.
    it.each([
      ['Ctrl+Shift+Z', '{Control>}{Shift>}z{/Shift}{/Control}'],
      ['Ctrl+Y', '{Control>}y{/Control}'],
    ])('redoes an option’s text with %s', async (_, redoKeys) => {
      const { user } = await renderEditor();
      await openChip(user, 1);
      const [input] = optionInputs();
      await user.type(input, 's');

      await user.keyboard('{Control>}z{/Control}');
      expect(input).toHaveValue('revolves');
      await user.keyboard(redoKeys);
      expect(input).toHaveValue('revolvess');
      expect(chips()[1]).toHaveTextContent('revolvess');
    });

    it('keeps focus in the panel when an undo takes away the focused option', async () => {
      const { user } = await renderEditor();
      await openChip(user, 1);
      await user.click(screen.getByRole('button', { name: tr.addInlineChoiceOptionBtn$() }));
      await waitFor(() => expect(optionInputs()[1]).toHaveFocus());

      await user.keyboard('{Control>}z{/Control}');
      expect(optionInputs().map(input => input.value)).toEqual(['revolves']);
      await waitFor(() => expect(optionInputs()[0]).toHaveFocus());

      // Still in the panel, Escape still closes it.
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('keeps focus in the panel when a redo takes away the focused option', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      await user.click(
        screen.getByRole('button', { name: tr.deleteInlineChoiceOptionBtn$({ number: 2 }) }),
      );
      await user.keyboard('{Control>}z{/Control}');
      expect(optionInputs().map(input => input.value)).toEqual(['Sun', 'Moon', 'Stars']);
      optionInputs()[1].focus();

      await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
      expect(optionInputs().map(input => input.value)).toEqual(['Sun', 'Stars']);
      await waitFor(() => expect(optionInputs()[1]).toHaveFocus());
    });

    it('switches to the chip an undo or redo changed, for the step to be seen', async () => {
      const { user } = await renderEditor();
      await openChip(user, 1);
      await user.type(optionInputs()[0], 's');
      await user.keyboard('{Escape}');
      await openChip(user, 0);
      await waitFor(() => expect(optionInputs()[0]).toHaveFocus());
      const dialogOf = number =>
        screen.getByRole('dialog', { name: tr.inlineChoiceOptionsDialogLabel$({ number }) });

      await user.keyboard('{Control>}z{/Control}');
      await waitFor(() => expect(dialogOf(2)).toContainElement(document.activeElement));
      expect(optionInputs().map(input => input.value)).toEqual(['revolves']);

      await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
      expect(optionInputs().map(input => input.value)).toEqual(['revolvess']);
      expect(dialogOf(2)).toContainElement(document.activeElement);
    });

    it('undoes and redoes from the panel’s other controls', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      const radio = screen.getByRole('radio', {
        name: tr.markInlineChoiceOptionCorrect$({ number: 2 }),
      });
      await user.click(radio);
      await user.keyboard('{Control>}z{/Control}');
      expect(radio).not.toBeChecked();
      await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
      expect(radio).toBeChecked();

      await user.click(
        screen.getByRole('button', {
          name: dragTr.$tr('moveItemDownLabel', { item: optionLabel(1) }),
        }),
      );
      expect(optionInputs().map(input => input.value)).toEqual(['Moon', 'Sun', 'Stars']);
      await user.keyboard('{Control>}z{/Control}');
      expect(optionInputs().map(input => input.value)).toEqual(['Sun', 'Moon', 'Stars']);
    });

    it('keeps focus in the panel when a redo takes away the focused remove button', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      const remove = () =>
        screen.getByRole('button', { name: tr.deleteInlineChoiceOptionBtn$({ number: 2 }) });
      await user.click(remove());
      await user.keyboard('{Control>}z{/Control}');
      expect(optionInputs().map(input => input.value)).toEqual(['Sun', 'Moon', 'Stars']);
      remove().focus();

      await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
      expect(optionInputs().map(input => input.value)).toEqual(['Sun', 'Stars']);
      await waitFor(() => expect(optionInputs()[1]).toHaveFocus());
    });
  });

  describe('Shuffle', () => {
    const shuffle = () => screen.getByRole('checkbox', { name: tr.shuffleAnswersLabel$() });
    const moveDown = () =>
      screen.queryByRole('button', {
        name: dragTr.$tr('moveItemDownLabel', { item: optionLabel(1) }),
      });

    it('is off for a new question', async () => {
      render(InlineChoiceEditor, {
        props: {
          interaction: descriptor.buildXML(descriptor.parse('', []), QuestionType.INLINE_CHOICE),
          questionType: QuestionType.INLINE_CHOICE,
          mode: 'edit',
          teleportTargetId: 'settings-target',
        },
        routes: new VueRouter(),
      });
      expect(
        await screen.findByRole('checkbox', { name: tr.shuffleAnswersLabel$() }),
      ).not.toBeChecked();
    });

    it('hides the reorder controls while on, and shows them again when off', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      expect(moveDown()).toBeInTheDocument();

      await user.click(shuffle());
      expect(moveDown()).not.toBeInTheDocument();

      await user.click(shuffle());
      expect(moveDown()).toBeInTheDocument();
    });

    it('is saved on every dropdown, and read back', async () => {
      const { emitted, user } = await renderEditor();
      await user.click(shuffle());

      const [interaction] = emitted()['update:interaction'].at(-1);
      expect([...interaction.bodyXml.matchAll(/shuffle="(\w+)"/g)].map(m => m[1])).toEqual([
        'true',
        'true',
      ]);
      expect(descriptor.parse(interaction.bodyXml, interaction.responseDeclarations).shuffle).toBe(
        true,
      );
    });
  });

  describe('focus', () => {
    const closeButton = () => screen.getByRole('button', { name: tr.closeInlineChoiceOptions$() });
    const addOptionButton = () =>
      screen.getByRole('button', { name: tr.addInlineChoiceOptionBtn$() });

    it('wraps from its last control to its first with Tab', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      addOptionButton().focus();

      await user.tab();
      expect(closeButton()).toHaveFocus();
    });

    // The panel opens with focus put on its first option, not tabbed in.
    it('wraps from its first control to its last with Shift+Tab, from the start', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      await waitFor(() => expect(optionInputs()[0]).toHaveFocus());
      closeButton().focus();

      await user.tab({ shift: true });
      expect(addOptionButton()).toHaveFocus();

      closeButton().focus();
      await user.tab({ shift: true });
      expect(addOptionButton()).toHaveFocus();
    });

    it('returns to the chip when Escape closes the panel', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      await waitFor(() => expect(optionInputs()[0]).toHaveFocus());

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(chips()[0]).toHaveFocus());
      expect(chips()[0]).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes with Escape after a click on a part of the panel that takes no focus', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      await user.click(within(dialog()).getByText(tr.inlineChoiceOptionsLabel$()));
      expect(dialog()).toContainElement(document.activeElement);

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(chips()[0]).toHaveFocus());
    });

    it('returns to the chip when the close control closes the panel', async () => {
      const { user } = await renderEditor();
      await openChip(user, 1);
      await user.click(screen.getByRole('button', { name: tr.closeInlineChoiceOptions$() }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(chips()[1]).toHaveFocus());
    });
  });

  it('closes the panel when its chip leaves the passage', async () => {
    const { user } = await renderEditor();
    // Inserting a chip opens it; undoing the insert takes it away.
    await user.click(screen.getByRole('button', { name: tr.insertInlineChoice$() }));
    await waitFor(() => expect(chips()).toHaveLength(3));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // From the keyboard, as a click in the passage would close the panel by itself.
    const editor = section(tr.passageEditorLabel$()).querySelector('.ProseMirror');
    editor.focus();
    await fireEvent.keyDown(editor, { key: 'z', keyCode: 90, ctrlKey: true });
    expect(chips()).toHaveLength(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the panel on a click in the passage, for the passage to be edited', async () => {
    const { user } = await renderEditor();
    await openChip(user, 0);
    const text = section(tr.passageEditorLabel$()).querySelector('.ProseMirror p');
    // ProseMirror finds where a click lands from its coordinates, which jsdom lacks.
    document.elementFromPoint = () => text;
    try {
      await user.click(text);
    } finally {
      delete document.elementFromPoint;
    }

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(chips()[0]).toHaveAttribute('aria-expanded', 'false');
  });

  describe('on a click outside the editor', () => {
    let outside;
    beforeEach(() => {
      outside = document.createElement('button');
      outside.textContent = 'Outside';
      document.body.append(outside);
    });
    afterEach(() => outside.remove());

    it('closes the panel, leaving focus where the click put it', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);
      await waitFor(() => expect(optionInputs()[0]).toHaveFocus());

      await user.click(outside);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(chips()[0]).toHaveAttribute('aria-expanded', 'false');
      await nextTick();
      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(outside).toHaveFocus();
    });

    it('stays open after a press that began in it, as when an option is dragged out', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);

      await fireEvent.pointerDown(optionInputs()[0]);
      await fireEvent.pointerUp(outside);
      // The browser clicks the closest element that holds both ends of the press.
      await fireEvent.click(document.body);
      expect(dialog()).toBeInTheDocument();
    });

    // As with the toolbar's menus, the click dismisses the popup; a second one closes the editor.
    it('keeps the passage open', async () => {
      const { user } = await renderEditor();
      await openChip(user, 0);

      await user.click(outside);
      expect(section(tr.passageEditorLabel$()).querySelector('.ProseMirror')).toHaveAttribute(
        'contenteditable',
        'true',
      );
    });
  });

  it('keeps the panel open until a click on another chip switches it to that chip', async () => {
    const { user } = await renderEditor();
    await openChip(user, 0);

    await fireEvent.pointerDown(chips()[1]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(chips()[1]);
    await waitFor(() => expect(optionInputs().map(input => input.value)).toEqual(['revolves']));
    expect(chips()[0]).toHaveAttribute('aria-expanded', 'false');
    expect(chips()[1]).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens a chip it inserts, ready for its options', async () => {
    const { emitted, user } = await renderEditor();
    await user.click(screen.getByRole('button', { name: tr.insertInlineChoice$() }));

    await screen.findByRole('dialog');
    await waitFor(() => expect(optionInputs()[0]).toHaveFocus());
    await user.keyboard('Venus');
    const saved = savedDropdowns(emitted());
    expect(saved).toHaveLength(3);
    expect(saved.map(d => d.options.map(o => o.text))).toContainEqual(['Venus']);
  });

  it('focuses the first option of a chip inserted from the keyboard', async () => {
    const { user } = await renderEditor();
    await waitFor(() => expect(document.activeElement).toHaveClass('ProseMirror'));
    // Off the passage, which then takes focus back a frame after the insert.
    screen.getByRole('button', { name: tr.insertInlineChoice$() }).focus();
    await user.keyboard('{Enter}');

    await screen.findByRole('dialog');
    await waitFor(() => expect(optionInputs()[0]).toHaveFocus());
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    expect(optionInputs()[0]).toHaveFocus();
  });

  it('saves the passage images in their stored form while a chip is open', async () => {
    const image = '83ab37e959e03fec7be3e1bf834cb169.jpg';
    const { emitted, user } = await renderEditor({
      interaction: interactionOf({ passage: `${PASSAGE}<p><img src="${image}" alt="a"></p>` }),
    });
    await openChip(user, 1);
    await user.type(optionInputs()[0], 's');

    const [interaction] = emitted()['update:interaction'].at(-1);
    expect(interaction.bodyXml).toContain(`src="${image}"`);
    expect(interaction.bodyXml).not.toContain('/content/storage/');
  });

  it('does not save which chip is open', async () => {
    const { emitted, user } = await renderEditor();
    const before = emitted()['update:interaction'].at(-1)[0].bodyXml;
    await openChip(user, 0);
    expect(emitted()['update:interaction'].at(-1)[0].bodyXml).toBe(before);
  });

  it('restores every chip’s options and correct answer when reopened', async () => {
    const { emitted, unmount, user } = await renderEditor();
    await openChip(user, 0);
    await user.click(
      screen.getByRole('radio', { name: tr.markInlineChoiceOptionCorrect$({ number: 3 }) }),
    );
    const [saved] = emitted()['update:interaction'].at(-1);
    unmount();

    await renderEditor({ interaction: saved });
    expect(chips()[0]).toHaveTextContent('Stars');
    expect(chips()[1]).toHaveTextContent('revolves');
    await openChip(user, 0);
    expect(optionInputs().map(input => input.value)).toEqual(['Sun', 'Moon', 'Stars']);
    expect(
      screen.getByRole('radio', { name: tr.markInlineChoiceOptionCorrect$({ number: 3 }) }),
    ).toBeChecked();
  });

  describe('validation', () => {
    it('marks the question incomplete and flags a chip without a correct answer', async () => {
      const { emitted, user } = await renderEditor();
      expect(emitted()['update:errors'].at(-1)[0]).toEqual([
        { code: 'NO_CORRECT_ANSWER', id: 'r1' },
      ]);
      expect(
        within(section(tr.passageEditorLabel$())).getByText(tr.errorInlineChoiceOptionProblems$()),
      ).toBeInTheDocument();
      expect(chips()[0]).toHaveAccessibleName(/needs attention/);
      expect(chips()[1]).not.toHaveAccessibleName(/needs attention/);
      // The error icon stands in for the option count, as on an option row.
      expect(chips()[0]).toHaveTextContent(new RegExp(`^${tr.addAnswers$()}$`));
      expect(chips()[0].querySelector('svg')).toBeInTheDocument();
      expect(chips()[1]).toHaveTextContent('1 revolves');

      await openChip(user, 0);
      expect(within(dialog()).getByText(tr.errorNoCorrectAnswer$())).toBeInTheDocument();
    });

    it('shows a duplicate option on its row and on its chip', async () => {
      const { user } = await renderEditor();
      await openChip(user, 1);
      await user.click(screen.getByRole('button', { name: tr.addInlineChoiceOptionBtn$() }));
      await user.keyboard('revolves');

      expect(within(dialog()).getAllByText(tr.errorDuplicateChoiceContent$())).toHaveLength(2);
      expect(optionInputs()[0]).toHaveAccessibleDescription(tr.errorDuplicateChoiceContent$());
      expect(optionInputs()[1]).toHaveAccessibleDescription(tr.errorDuplicateChoiceContent$());
      expect(chips()[1]).toHaveAccessibleName(/needs attention/);
    });

    it('shows a blank option in its row', async () => {
      const { user } = await renderEditor();
      await openChip(user, 1);
      await user.click(screen.getByRole('button', { name: tr.addInlineChoiceOptionBtn$() }));

      expect(optionInputs()[1]).toHaveAttribute('aria-invalid', 'true');
      expect(within(dialog()).getByText(tr.errorEmptyChoiceContent$())).toBeInTheDocument();
      expect(optionInputs()[1]).toHaveAccessibleDescription(tr.errorEmptyChoiceContent$());
      expect(optionInputs()[0]).not.toHaveAttribute('aria-describedby');
    });

    it('shows a passage without dropdowns on the passage editor', async () => {
      render(InlineChoiceEditor, {
        props: {
          interaction: interactionOf({ passage: '<p>Nothing to choose</p>' }),
          questionType: QuestionType.INLINE_CHOICE,
          mode: 'edit',
          teleportTargetId: 'settings-target',
        },
        routes: new VueRouter(),
      });
      await screen.findByRole('heading', { name: tr.passageEditorLabel$() });
      const passageSection = within(section(tr.passageEditorLabel$()));
      expect(passageSection.getByText(tr.errorNoInlineChoice$())).toBeInTheDocument();
      expect(
        passageSection.getByRole('button', { name: tr.editPassageLabel$() }),
      ).toBeInTheDocument();
    });
  });

  describe('view mode', () => {
    it('shows the question and the passage with the correct answers', async () => {
      await renderEditor({ mode: 'view', showAnswers: true });
      expect(within(section(tr.questionLabel$())).getByText('Pick the words')).toBeInTheDocument();
      const [, revealed] = within(section(tr.passageLabel$())).getAllByRole('img', CHIP);
      expect(revealed).toHaveTextContent('revolves');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: tr.passageEditorLabel$() }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: tr.questionOptionalLabel$() }),
      ).not.toBeInTheDocument();
    });

    it('shows the answers while editing, even in the closed passage', async () => {
      render(InlineChoiceEditor, {
        props: {
          interaction: interactionOf(),
          questionType: QuestionType.INLINE_CHOICE,
          mode: 'edit',
          showAnswers: false,
          teleportTargetId: 'settings-target',
        },
        routes: new VueRouter(),
      });
      const [, closed] = await screen.findAllByRole('img', { name: /answer dropdown/ });
      expect(closed).toHaveTextContent('revolves');
      expect(closed).not.toHaveTextContent(tr.chooseAnswer$());
    });

    it('shows a choice to make in place of the answers without Show answers', async () => {
      await renderEditor({ mode: 'view', showAnswers: false });
      const [, hidden] = screen.getAllByRole('img', { name: /answer dropdown/ });
      expect(hidden).not.toHaveTextContent('revolves');
      expect(hidden).toHaveTextContent(`1 ${tr.chooseAnswer$()}`);
      expect(hidden).toHaveAccessibleName(
        tr.answerDropdownHidden$({ label: tr.chooseAnswer$(), count: 1 }),
      );
    });

    it('marks a hidden chip that needs attention by more than colour', async () => {
      await renderEditor({ mode: 'view', showAnswers: false });
      const [incomplete, complete] = screen.getAllByRole('img', { name: /answer dropdown/ });
      expect(incomplete).toHaveAccessibleName(
        tr.answerDropdownHiddenNeedsAttention$({ label: tr.chooseAnswer$(), count: 3 }),
      );
      // The error icon stands in for its option count.
      expect(incomplete).toHaveTextContent(new RegExp(`^${tr.chooseAnswer$()}$`));
      expect(incomplete.querySelector('svg')).toBeInTheDocument();
      expect(complete.querySelector('svg')).not.toBeInTheDocument();
    });
  });
});
