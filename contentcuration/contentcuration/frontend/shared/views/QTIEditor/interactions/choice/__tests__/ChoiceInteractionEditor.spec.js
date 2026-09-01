import { render, screen, fireEvent, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import ChoiceInteractionEditor from '../ChoiceInteractionEditor.vue';

import {
  CHOICE_SINGLE_SELECT_XML,
  CHOICE_MULTI_SELECT_XML,
  CHOICE_NO_PROMPT_XML,
  CHOICE_SINGLE_DECL_XML as SINGLE_DECL,
  CHOICE_MULTI_DECL_XML as MULTI_DECL,
  mockInteractionBlock as block,
  mockInteractionBlockWithDecl as blockWithDecl,
} from '../../../utils/testingFixtures';
import { QuestionType } from '../../../constants';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';
import { dragSortStrings as dragTr } from 'shared/views/dragSort/dragSortStrings';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
// jsdom cannot produce the pointer events real SortableJS listens for, so the tests
// call the captured `onEnd` instead.
let mockSortableInstances;
jest.mock('sortablejs', () =>
  jest.fn().mockImplementation((el, options) => {
    const instance = { el, options, option: jest.fn(), destroy: jest.fn() };
    mockSortableInstances.push(instance);
    return instance;
  }),
);
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});
// `useDraggableUniverse` destructures this composable too, so the automock has to return
// a usable object rather than undefined.
jest.mock('kolibri-design-system/lib/composables/useKLiveRegion');

let teleportContainer;
let sendPoliteMessage;

beforeEach(() => {
  mockSortableInstances = [];
  sendPoliteMessage = jest.fn();
  useKLiveRegion.mockReturnValue({ sendPoliteMessage });
  teleportContainer = document.createElement('div');
  teleportContainer.id = 'test-settings-target';
  document.body.appendChild(teleportContainer);
});

afterEach(() => {
  if (teleportContainer && teleportContainer.parentNode) {
    teleportContainer.parentNode.removeChild(teleportContainer);
  }
});

const choiceLabel = number => tr.$tr('choiceItemLabel', { number });
const moveUpName = number => dragTr.$tr('moveItemUpLabel', { item: choiceLabel(number) });
const moveDownName = number => dragTr.$tr('moveItemDownLabel', { item: choiceLabel(number) });

const renderEditor = (props = {}) =>
  render(ChoiceInteractionEditor, {
    props: { mode: 'edit', teleportTargetId: 'test-settings-target', ...props },
    routes: new VueRouter(),
  });

const dragFirstRowToLast = async () => {
  const { options, el } = mockSortableInstances[mockSortableInstances.length - 1];
  options.onEnd({
    item: el.children[0],
    from: el,
    to: el,
    oldIndex: 0,
    oldDraggableIndex: 0,
    newDraggableIndex: el.children.length - 1,
  });
  await nextTick();
};

describe('ChoiceInteractionEditor', () => {
  describe('prompt rendering', () => {
    it('renders the prompt text from the XML', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getByText('Which planet is closest to the Sun?')).toBeInTheDocument();
    });

    it('renders no prompt when the XML has no <qti-prompt>', () => {
      renderEditor({
        interaction: block(CHOICE_NO_PROMPT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.queryByText('Which planet is closest to the Sun?')).not.toBeInTheDocument();
    });
  });

  describe('singleSelect (KRadioButton)', () => {
    it('renders a radio button for each choice', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('renders the correct choice labels', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getByText('Mercury')).toBeInTheDocument();
      expect(screen.getByText('Venus')).toBeInTheDocument();
      expect(screen.getByText('Earth')).toBeInTheDocument();
    });

    it('pre-checks the correct choice radio', () => {
      renderEditor({
        interaction: blockWithDecl(CHOICE_SINGLE_SELECT_XML, SINGLE_DECL),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toBeChecked(); // mercury
      expect(radios[1]).not.toBeChecked(); // venus
    });

    it('allows toggling a different radio', async () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const radios = screen.getAllByRole('radio');
      await fireEvent.click(radios[1]);
      expect(radios[0]).not.toBeChecked();
      expect(radios[1]).toBeChecked();
    });
  });

  describe('multiSelect (KCheckbox)', () => {
    const choiceCheckboxes = () => {
      const group = screen.queryByRole('group', { name: tr.$tr('answersLabel') });
      if (!group) return [];
      return Array.from(group.querySelectorAll('input[type="checkbox"]'));
    };

    it('renders a checkbox for each choice', () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      expect(choiceCheckboxes()).toHaveLength(3);
    });

    it('renders the correct choice labels', () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
      expect(screen.getByText('Option C')).toBeInTheDocument();
    });

    it('pre-checks multiple correct choices', () => {
      renderEditor({
        interaction: blockWithDecl(CHOICE_MULTI_SELECT_XML, MULTI_DECL),
        questionType: QuestionType.MULTI_SELECT,
      });
      const checkboxes = choiceCheckboxes();
      expect(checkboxes[0]).toBeChecked(); // a
      expect(checkboxes[1]).not.toBeChecked(); // b
      expect(checkboxes[2]).toBeChecked(); // c
    });

    it('allows checking multiple checkboxes independently', async () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      const [checkA, checkB] = choiceCheckboxes();
      await fireEvent.click(checkA);
      await fireEvent.click(checkB);
      expect(checkA).toBeChecked();
      expect(checkB).toBeChecked();
    });

    it('allows unchecking a checked checkbox', async () => {
      renderEditor({
        interaction: blockWithDecl(CHOICE_MULTI_SELECT_XML, MULTI_DECL),
        questionType: QuestionType.MULTI_SELECT,
      });
      const [checkA] = choiceCheckboxes();
      await fireEvent.click(checkA);
      expect(checkA).not.toBeChecked();
    });
  });

  describe('edit mode controls', () => {
    it('renders an Add choice button', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getByRole('button', { name: tr.$tr('addChoiceBtn') })).toBeInTheDocument();
    });

    it('adds a new choice row when Add choice is clicked', async () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      await fireEvent.click(screen.getByRole('button', { name: tr.$tr('addChoiceBtn') }));
      expect(screen.getAllByRole('radio')).toHaveLength(4);
    });

    it('gives every choice row its own delete button', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getAllByRole('button', { name: tr.$tr('deleteChoiceBtn') })).toHaveLength(3);
    });

    it('hides move-up on the first choice and move-down on the last', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      // `v-show` hides the out-of-range control, dropping it out of the accessibility tree
      expect(screen.queryByRole('button', { name: moveUpName(1) })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: moveUpName(2) })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: moveUpName(3) })).toBeInTheDocument();

      expect(screen.getByRole('button', { name: moveDownName(1) })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: moveDownName(2) })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: moveDownName(3) })).not.toBeInTheDocument();
    });

    it('reorders the choices when a row is dragged to a new position', async () => {
      const { emitted } = renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      await dragFirstRowToLast();

      const { bodyXml } = emitted()['update:interaction'].pop()[0];
      expect(bodyXml.indexOf('identifier="mercury"')).toBeGreaterThan(
        bodyXml.indexOf('identifier="earth"'),
      );
    });

    it('drops the reorder controls once the choices are shuffled', async () => {
      const user = userEvent.setup();
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getByRole('button', { name: moveDownName(1) })).toBeInTheDocument();

      await user.click(
        within(teleportContainer).getByRole('checkbox', { name: tr.$tr('shuffleAnswersLabel') }),
      );

      expect(screen.queryByRole('button', { name: moveDownName(1) })).not.toBeInTheDocument();
      const { option } = mockSortableInstances[mockSortableInstances.length - 1];
      expect(option).toHaveBeenCalledWith('sort', false);
    });

    it('binds the drag list to the rendered element after the question type changes', async () => {
      // Switching question type swaps KRadioButtonGroup for a plain div. Left bound to the
      // detached element, drag silently stops working, so assert on the element SortableJS
      // was handed rather than on anything the editor emits.
      const { updateProps } = renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      await updateProps({ questionType: QuestionType.MULTI_SELECT });

      const { el } = mockSortableInstances[mockSortableInstances.length - 1];
      expect(document.body).toContainElement(el);
    });

    it('reorders the choices when a row is moved down by keyboard', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      await user.click(screen.getByRole('button', { name: moveDownName(1) }));
      const { bodyXml } = emitted()['update:interaction'].pop()[0];
      expect(bodyXml.indexOf('identifier="venus"')).toBeLessThan(
        bodyXml.indexOf('identifier="mercury"'),
      );
    });

    it('announces the moved choice and its new position', async () => {
      const user = userEvent.setup();
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      await user.click(screen.getByRole('button', { name: moveDownName(1) }));

      expect(sendPoliteMessage).toHaveBeenCalledWith(
        dragTr.$tr('itemMovedToPosition', { item: choiceLabel(1), position: 2, total: 3 }),
      );
    });

    it('keeps focus on the move-down button of the choice that moved', async () => {
      const user = userEvent.setup();
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      await user.click(screen.getByRole('button', { name: moveDownName(1) }));

      // The moved choice is now second, so its widget is the one labelled for position 2.
      expect(screen.getByRole('button', { name: moveDownName(2) })).toHaveFocus();
    });

    it('moves focus to the move-up button when a choice lands last', async () => {
      const user = userEvent.setup();
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      await user.click(screen.getByRole('button', { name: moveDownName(2) }));

      // Last position hides move-down, so focus has to fall back to move-up.
      expect(screen.getByRole('button', { name: moveUpName(3) })).toHaveFocus();
    });

    it('disables delete when only one choice remains', async () => {
      const xml = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
        <qti-simple-choice identifier="a">Only</qti-simple-choice>
      </qti-choice-interaction>`;
      renderEditor({
        interaction: block(xml),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getByRole('button', { name: tr.$tr('deleteChoiceBtn') })).toBeDisabled();
    });

    it('removes a choice row when delete is clicked', async () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const deleteBtns = screen.getAllByRole('button', { name: tr.$tr('deleteChoiceBtn') });
      await fireEvent.click(deleteBtns[0]);
      expect(screen.getAllByRole('radio')).toHaveLength(2);
    });

    it('opens the prompt for editing via keyboard (Enter)', async () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const promptBtn = screen.getByRole('button', { name: tr.$tr('editQuestionLabel') });
      await fireEvent.click(promptBtn);
      expect(
        screen.queryByRole('button', { name: tr.$tr('editQuestionLabel') }),
      ).not.toBeInTheDocument();
    });

    it('opens a choice for editing via keyboard (Space)', async () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const choiceBtn = screen.getByRole('button', {
        name: tr.$tr('editAnswerOptionLabel', { number: 2 }),
      });
      await fireEvent.click(choiceBtn);
      expect(
        screen.queryByRole('button', { name: tr.$tr('editAnswerOptionLabel', { number: 2 }) }),
      ).not.toBeInTheDocument();
    });
  });

  describe('view mode', () => {
    it('hides choices when mode=view and showAnswers=false', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
        mode: 'view',
        showAnswers: false,
      });
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('shows choices when mode=view and showAnswers=true', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
        mode: 'view',
        showAnswers: true,
      });
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('disables the correct-choice control in view mode', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
        mode: 'view',
        showAnswers: true,
      });
      screen.getAllByRole('radio').forEach(r => expect(r).toBeDisabled());
    });

    it('hides add/move/delete buttons in view mode', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
        mode: 'view',
        showAnswers: true,
      });
      expect(
        screen.queryByRole('button', { name: tr.$tr('addChoiceBtn') }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: tr.$tr('deleteChoiceBtn') }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: moveDownName(1) })).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('does not show errors before any field is touched', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows global errors (no correct choice) after a structural mutation', async () => {
      jest.useFakeTimers();
      // Add a choice so we have 2+ choices — then the only error is no correct choice.
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      // Clicking Add choice mutates state → debounced validate fires.
      await fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      // Flush Vue watcher queue.
      await nextTick();
      // Advance past the 400ms debounce, then flush the resulting DOM update.
      jest.advanceTimersByTime(400);
      await nextTick();
      jest.useRealTimers();
      // NO_CORRECT_ANSWER (and potentially others) should be shown after validation runs.
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });

    it('replaces the selection control with the error icon on an invalid choice', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getAllByRole('radio')).toHaveLength(3);
      // The added choice starts empty, so the debounced validation flags it.
      await user.click(screen.getByRole('button', { name: /add choice/i }));
      await nextTick();
      jest.advanceTimersByTime(400);
      await nextTick();
      jest.useRealTimers();
      // Four rows, but the invalid one shows the error icon where its radio was
      expect(screen.getAllByRole('button', { name: tr.$tr('deleteChoiceBtn') })).toHaveLength(4);
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('shows no-correct-choice error after toggling and running validation', async () => {
      jest.useFakeTimers();
      renderEditor({
        interaction: blockWithDecl(CHOICE_SINGLE_SELECT_XML, SINGLE_DECL),
        questionType: QuestionType.SINGLE_SELECT,
      });
      // Trigger validation via add-choice which mutates state → debounced validate fires.
      await fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      await nextTick();
      jest.advanceTimersByTime(400);
      await nextTick();
      jest.useRealTimers();
      // Validate fires; errors should appear (e.g. empty choice content).
    });
  });

  describe('emits', () => {
    it('emits update:interaction on mount with the rebuilt XML and declarations', () => {
      const { emitted } = renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(emitted()['update:interaction']).toBeTruthy();
      const payload = emitted()['update:interaction'][0][0];
      expect(typeof payload.bodyXml).toBe('string');
      expect(Array.isArray(payload.responseDeclarations)).toBe(true);
    });

    it('emits update:interaction after adding a choice', async () => {
      const { emitted } = renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const before = emitted()['update:interaction'].length;
      await fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      expect(emitted()['update:interaction'].length).toBeGreaterThan(before);
    });
  });

  describe('Answer settings', () => {
    it('renders Answer settings section in edit mode', () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      expect(
        within(teleportContainer).getByText(tr.$tr('answerSettingsLabel')),
      ).toBeInTheDocument();
    });

    it('renders shuffle answers checkbox', () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      // KIconButton also has the same aria-label — use role=checkbox specifically
      expect(
        within(teleportContainer).getByRole('checkbox', { name: tr.$tr('shuffleAnswersLabel') }),
      ).toBeInTheDocument();
    });

    it('hides show-answer-count checkbox for single choice', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(
        within(teleportContainer).queryByRole('checkbox', { name: tr.$tr('showAnswerCountLabel') }),
      ).not.toBeInTheDocument();
    });

    it('shows show-answer-count checkbox for multi choice', () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      expect(
        within(teleportContainer).getByRole('checkbox', { name: tr.$tr('showAnswerCountLabel') }),
      ).toBeInTheDocument();
    });

    it('toggling shuffle emits updated XML with shuffle="true"', async () => {
      const { emitted } = renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      await fireEvent.click(
        within(teleportContainer).getByRole('checkbox', { name: tr.$tr('shuffleAnswersLabel') }),
      );
      const latest = emitted()['update:interaction'].at(-1)[0];
      expect(latest.bodyXml).toContain('shuffle="true"');
    });

    it('clicking the info button next to shuffle opens a modal', async () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      const infoBtn = within(teleportContainer).getByRole('button', {
        name: tr.$tr('shuffleAnswersInfoTitle'),
      });
      await fireEvent.click(infoBtn);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('shuffleAnswersInfoBody'))).toBeInTheDocument();
    });

    it('KModal closes when the Close button is clicked', async () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      const infoBtn = within(teleportContainer).getByRole('button', {
        name: tr.$tr('shuffleAnswersInfoTitle'),
      });
      await fireEvent.click(infoBtn);
      await fireEvent.click(screen.getByRole('button', { name: tr.$tr('closeBtnLabel') }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('all radios have an accessible label', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      screen.getAllByRole('radio').forEach(r => expect(r).toHaveAccessibleName());
    });

    it('all checkboxes have an accessible label', () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      screen.getAllByRole('checkbox').forEach(c => expect(c).toHaveAccessibleName());
    });

    it('renders the options as a list', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const list = screen.getByRole('list');
      // Asserted as an attribute, not a role: jsdom gives a bare <ol> the implicit list role,
      // so the explicit one Safari needs would be deletable with this test still green.
      expect(list).toHaveAttribute('role', 'list');
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      items.forEach(item => expect(within(item).getAllByRole('radio')).toHaveLength(1));
    });

    it('keeps the radiogroup around the list across a re-render', async () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const radiogroup = () => screen.getByRole('radiogroup', { name: tr.$tr('answersLabel') });
      expect(radiogroup()).toContainElement(screen.getByRole('list'));

      // Binding an `undefined` role on the wrapper makes Vue strip the role
      // KRadioButtonGroup set on its own root, but only on a later patch.
      await fireEvent.click(screen.getByRole('button', { name: tr.$tr('addChoiceBtn') }));
      expect(radiogroup()).toContainElement(screen.getByRole('list'));
    });

    it('groups multi-select options under the answers header', () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      const group = screen.getByRole('group', { name: tr.$tr('answersLabel') });
      expect(group).toContainElement(screen.getByRole('list'));
    });

    it('icon buttons have accessible labels', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      screen.getAllByRole('button').forEach(b => expect(b).toHaveAccessibleName());
    });
  });

  describe('graceful fallback', () => {
    it('renders default interaction state when bodyXml is empty', () => {
      renderEditor({ interaction: block(''), questionType: QuestionType.SINGLE_SELECT });
      expect(screen.getAllByRole('radio')).toHaveLength(1);
    });

    it('renders default interaction state when XML is malformed', () => {
      renderEditor({ interaction: block('<unclosed'), questionType: QuestionType.SINGLE_SELECT });
      expect(screen.getAllByRole('radio')).toHaveLength(1);
    });
  });
});
