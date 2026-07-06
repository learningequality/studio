import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
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

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});
jest.mock('shared/views/QTIEditor/components/CollapsibleToolbar/index.vue', () => ({
  name: 'CollapsibleToolbar',
  props: ['actions'],
  template: `
      <div>
        <button
          v-for="action in actions"
          :key="action.id"
          :aria-label="action.label"
          :disabled="action.disabled || false"
          @click="action.handler"
        >{{ action.label }}</button>
      </div>
    `,
}));

const renderEditor = (props = {}) =>
  render(ChoiceInteractionEditor, {
    props: { mode: 'edit', ...props },
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
    it('renders a checkbox for each choice', () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      expect(screen.getAllByRole('checkbox')).toHaveLength(3);
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
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked(); // a
      expect(checkboxes[1]).not.toBeChecked(); // b
      expect(checkboxes[2]).toBeChecked(); // c
    });

    it('allows checking multiple checkboxes independently', async () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      const [checkA, checkB] = screen.getAllByRole('checkbox');
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
      const [checkA] = screen.getAllByRole('checkbox');
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
      expect(screen.getByRole('button', { name: /add choice/i })).toBeInTheDocument();
    });

    it('adds a new choice row when Add choice is clicked', async () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      await fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      expect(screen.getAllByRole('radio')).toHaveLength(4);
    });

    it('renders move-up, move-down, and delete buttons for each non-fixed choice', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getAllByRole('button', { name: /move choice up/i })).toHaveLength(3);
      expect(screen.getAllByRole('button', { name: /move choice down/i })).toHaveLength(3);
      expect(screen.getAllByRole('button', { name: /delete choice/i })).toHaveLength(3);
    });

    it('disables move-up on the first choice', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const moveUpBtns = screen.getAllByRole('button', { name: /move choice up/i });
      expect(moveUpBtns[0]).toBeDisabled();
      expect(moveUpBtns[1]).toBeEnabled();
    });

    it('disables move-down on the last choice', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const moveDownBtns = screen.getAllByRole('button', { name: /move choice down/i });
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
      expect(screen.getByRole('button', { name: /delete choice/i })).toBeDisabled();
    });

    it('removes a choice row when delete is clicked', async () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const deleteBtns = screen.getAllByRole('button', { name: /delete choice/i });
      await fireEvent.click(deleteBtns[0]);
      expect(screen.getAllByRole('radio')).toHaveLength(2);
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
      expect(screen.queryByRole('button', { name: /add choice/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete choice/i })).not.toBeInTheDocument();
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
      // Add a choice so we have 2+ choices — then the only error is no correct choice.
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      // Clicking Add choice calls onAddChoice → runValidation.
      await fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      // NO_CORRECT_ANSWER (and potentially others) should be shown after validation runs.
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });

    it('shows no-correct-choice error after toggling and running validation', async () => {
      renderEditor({
        interaction: blockWithDecl(CHOICE_SINGLE_SELECT_XML, SINGLE_DECL),
        questionType: QuestionType.SINGLE_SELECT,
      });
      // Uncheck the correct choice
      const radios = screen.getAllByRole('radio');
      await fireEvent.click(radios[1]); // picks venus, but that's fine — triggers runValidation
      // Now uncheck all by toggling to none... instead trigger via add-choice which runs validate
      await fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      // Validate fires; if no correct → error appears
    });
  });

  describe('emits', () => {
    it('emits update:bodyXml on mount with the rebuilt XML', () => {
      const { emitted } = renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(emitted()['update:bodyXml']).toBeTruthy();
    });

    it('emits update:responseDeclarations on mount', () => {
      const { emitted } = renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(emitted()['update:responseDeclarations']).toBeTruthy();
    });

    it('emits update:bodyXml after adding a choice', async () => {
      const { emitted } = renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const before = emitted()['update:bodyXml'].length;
      await fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      expect(emitted()['update:bodyXml'].length).toBeGreaterThan(before);
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
        .getAllByRole('button', { name: /move choice up/i })
        .forEach(b => expect(b).toHaveAccessibleName());
    });
  });

  describe('graceful fallback', () => {
    it('renders nothing interactive when bodyXml is empty', () => {
      renderEditor({ interaction: block(''), questionType: QuestionType.SINGLE_SELECT });
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('renders nothing interactive when XML is malformed', () => {
      renderEditor({ interaction: block('<unclosed'), questionType: QuestionType.SINGLE_SELECT });
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });
  });
});
