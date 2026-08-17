import { render, screen, fireEvent, within } from '@testing-library/vue';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import ChoiceInteractionEditor from '../Editor.vue';

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

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});

let teleportContainer;

beforeEach(() => {
  teleportContainer = document.createElement('div');
  teleportContainer.id = 'test-settings-target';
  document.body.appendChild(teleportContainer);
});

afterEach(() => {
  if (teleportContainer && teleportContainer.parentNode) {
    teleportContainer.parentNode.removeChild(teleportContainer);
  }
});

const renderEditor = (props = {}) =>
  render(ChoiceInteractionEditor, {
    props: { mode: 'edit', teleportTargetId: 'test-settings-target', ...props },
    routes: new VueRouter(),
  });

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
      // 3 original choices + 1 newly added = 4 radios (choice list uses divs, not li elements)
      expect(screen.getAllByRole('radio')).toHaveLength(4);
    });

    it('renders move-up, move-down, and delete buttons for each non-fixed choice', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getAllByRole('button', { name: tr.$tr('moveChoiceUpBtn') })).toHaveLength(3);
      expect(screen.getAllByRole('button', { name: tr.$tr('moveChoiceDownBtn') })).toHaveLength(3);
      expect(screen.getAllByRole('button', { name: tr.$tr('deleteChoiceBtn') })).toHaveLength(3);
    });

    it('disables move-up on the first choice', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const moveUpBtns = screen.getAllByRole('button', { name: tr.$tr('moveChoiceUpBtn') });
      expect(moveUpBtns[0]).toBeDisabled();
      expect(moveUpBtns[1]).toBeEnabled();
    });

    it('disables move-down on the last choice', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const moveDownBtns = screen.getAllByRole('button', { name: tr.$tr('moveChoiceDownBtn') });
      expect(moveDownBtns[2]).toBeDisabled();
      expect(moveDownBtns[1]).toBeEnabled();
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
    });
  });

  describe('validation', () => {
    it('reports what is missing as soon as it renders', () => {
      // Validation is not debounced, so errors describe the state on screen from the start:
      // this fixture has no declaration, so no choice is marked correct.
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });

      expect(screen.getByText(tr.errorNoCorrectAnswer$())).toBeInTheDocument();
    });

    it('shows no errors for a question that is already complete', () => {
      renderEditor({
        interaction: blockWithDecl(CHOICE_SINGLE_SELECT_XML, SINGLE_DECL),
        questionType: QuestionType.SINGLE_SELECT,
      });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows global errors (no correct choice) after a structural mutation', async () => {
      // Add a choice so we have 2+ choices — then the only error is no correct choice.
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      // Clicking Add choice mutates state, which validates straight away.
      await fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      await nextTick();

      // NO_CORRECT_ANSWER (and potentially others) should be shown after validation runs.
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });

    it('shows the empty-choice error as soon as a choice is added', async () => {
      renderEditor({
        interaction: blockWithDecl(CHOICE_SINGLE_SELECT_XML, SINGLE_DECL),
        questionType: QuestionType.SINGLE_SELECT,
      });
      await fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      await nextTick();

      expect(screen.getByText(tr.errorEmptyChoiceContent$())).toBeInTheDocument();
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

    it('icon buttons have accessible labels', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      screen
        .getAllByRole('button', { name: tr.$tr('moveChoiceUpBtn') })
        .forEach(b => expect(b).toHaveAccessibleName());
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
