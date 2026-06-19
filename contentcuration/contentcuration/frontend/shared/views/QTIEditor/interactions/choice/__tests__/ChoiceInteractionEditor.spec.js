import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import ChoiceInteractionEditor from '../ChoiceInteractionEditor.vue';

import {
  CHOICE_SINGLE_SELECT_XML,
  CHOICE_MULTI_SELECT_XML,
  CHOICE_NO_PROMPT_XML,
  mockInteractionBlock as block,
} from '../../../utils/testingFixtures';
import { QuestionType } from '../../../constants';

const renderEditor = (props = {}) =>
  render(ChoiceInteractionEditor, {
    props: { mode: 'edit', ...props },
    routes: new VueRouter(),
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChoiceInteractionEditor', () => {
  describe('prompt rendering', () => {
    it('renders the prompt text from the XML', () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      expect(screen.getByText('Which planet is closest to the Sun?')).toBeInTheDocument();
    });

    it('renders no prompt element when the XML has no <qti-prompt>', () => {
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
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
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

    it('allows selecting a radio button', async () => {
      renderEditor({
        interaction: block(CHOICE_SINGLE_SELECT_XML),
        questionType: QuestionType.SINGLE_SELECT,
      });
      const mercury = screen.getByRole('radio', { name: 'Mercury' });
      expect(mercury).not.toBeChecked();
      await fireEvent.click(mercury);
      expect(mercury).toBeChecked();
    });
  });

  describe('multiSelect (KCheckbox)', () => {
    it('renders a checkbox for each choice', () => {
      renderEditor({
        interaction: block(CHOICE_MULTI_SELECT_XML),
        questionType: QuestionType.MULTI_SELECT,
      });
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
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
      renderEditor({ interaction: block(CHOICE_MULTI_SELECT_XML), questionType: 'multiSelect' });
      const [checkA] = screen.getAllByRole('checkbox');
      await fireEvent.click(checkA);
      expect(checkA).toBeChecked();
      await fireEvent.click(checkA);
      expect(checkA).not.toBeChecked();
    });
  });

  describe('graceful fallback', () => {
    it('renders nothing interactive when block is null', () => {
      renderEditor({ block: null, questionType: 'singleSelect' });
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('renders nothing interactive when block.bodyXml is an empty string', () => {
      renderEditor({ interaction: block(''), questionType: 'singleSelect' });
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('renders nothing interactive when XML is malformed', () => {
      renderEditor({ interaction: block('<unclosed'), questionType: 'singleSelect' });
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });
  });
});
