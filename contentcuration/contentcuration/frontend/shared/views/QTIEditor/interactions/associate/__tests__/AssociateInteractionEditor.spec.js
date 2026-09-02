import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import AssociateInteractionEditor from '../AssociateInteractionEditor.vue';

import {
  ASSOCIATE_XML,
  ASSOCIATE_DECL_XML,
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

const POOL_CONTENTS = ['Antonio', 'Prospero', 'Capulet', 'Montague', 'Lysander'];

// One pair whose second member has no content, so the pool carries a blank
// distractor the author still has to fill in.
const BLANK_DISTRACTOR_XML = `<qti-associate-interaction response-identifier="RESPONSE">
  <qti-prompt><p>Match each character to his adversary.</p></qti-prompt>
  <qti-simple-associable-choice identifier="choice_aaa11111" match-max="1">Antonio</qti-simple-associable-choice>
  <qti-simple-associable-choice identifier="choice_bbb22222" match-max="1">Prospero</qti-simple-associable-choice>
  <qti-simple-associable-choice identifier="choice_fff66666" match-max="1"></qti-simple-associable-choice>
</qti-associate-interaction>`;

const ONE_PAIR_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
  <qti-correct-response>
    <qti-value>choice_aaa11111 choice_bbb22222</qti-value>
  </qti-correct-response>
</qti-response-declaration>`;

// The mock TipTapEditor renders a <textarea> only for the card currently open.
const openTextarea = () => screen.queryAllByRole('textbox').find(el => el.tagName === 'TEXTAREA');

const button = name => screen.getByRole('button', { name });
const queryButton = name => screen.queryByRole('button', { name });

const editPairItem = (number, position) => tr.$tr('editPairItemLabel', { number, position });

const renderEditor = (props = {}) =>
  render(AssociateInteractionEditor, {
    props: {
      mode: 'edit',
      questionType: QuestionType.ASSOCIATE,
      interaction: blockWithDecl(ASSOCIATE_XML, ASSOCIATE_DECL_XML),
      ...props,
    },
    routes: new VueRouter(),
  });

const latestBodyXml = emitted => emitted()['update:interaction'].at(-1)[0].bodyXml;

describe('AssociateInteractionEditor', () => {
  describe('edit mode rendering', () => {
    it('renders the prompt text from the XML', () => {
      renderEditor();
      expect(screen.getByText(/Match each character/)).toBeInTheDocument();
    });

    it('renders every pair member and distractor from the XML', () => {
      renderEditor();
      for (const content of POOL_CONTENTS) {
        expect(screen.getByText(content)).toBeInTheDocument();
      }
    });

    it('renders a numbered label for each pair', () => {
      renderEditor();
      expect(screen.getByText(tr.$tr('pairNumberLabel', { number: 1 }))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('pairNumberLabel', { number: 2 }))).toBeInTheDocument();
    });

    it('renders the pairs and distractors section headers', () => {
      renderEditor();
      expect(screen.getByText(tr.$tr('correctPairsLabel'))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('correctPairsDescription'))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('distractorsLabel'))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('distractorsDescription'))).toBeInTheDocument();
    });

    it('renders the add pair and add distractor buttons', () => {
      renderEditor();
      expect(button(tr.$tr('addPairBtn'))).toBeInTheDocument();
      expect(button(tr.$tr('addDistractorBtn'))).toBeInTheDocument();
    });

    it('opens the first pair item for editing when the prompt is already written', () => {
      renderEditor();
      expect(queryButton(editPairItem(1, 1))).not.toBeInTheDocument();
      expect(openTextarea()).toHaveValue('Antonio');
    });

    it('opens the prompt for editing when there is no prompt yet', () => {
      renderEditor({ interaction: block('') });
      expect(queryButton(tr.$tr('editQuestionLabel'))).not.toBeInTheDocument();
    });
  });

  describe('editing content', () => {
    it('moves the open editor to the pair item that is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(editPairItem(2, 1)));
      expect(openTextarea()).toHaveValue('Capulet');
      expect(button(editPairItem(1, 1))).toBeInTheDocument();
    });

    it('writes the typed pair content into the emitted XML', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(editPairItem(2, 2)));
      await user.type(openTextarea(), 'Verona');
      expect(latestBodyXml(emitted)).toContain('Verona');
    });

    it('writes the typed prompt into the emitted XML', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(tr.$tr('editQuestionLabel')));
      await user.type(openTextarea(), 'Who rivals whom?');
      expect(latestBodyXml(emitted)).toContain('Who rivals whom?');
    });
  });

  describe('pairs', () => {
    it('appends a third pair and opens it when the add pair button is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addPairBtn')));
      expect(screen.getByText(tr.$tr('pairNumberLabel', { number: 3 }))).toBeInTheDocument();
      expect(queryButton(editPairItem(3, 1))).not.toBeInTheDocument();
    });

    it('removes the pair when its delete button is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('deletePairBtn', { number: 1 })));
      expect(screen.queryByText('Antonio')).not.toBeInTheDocument();
      expect(screen.getByText('Capulet')).toBeInTheDocument();
    });

    it('disables the delete button when a single pair remains', () => {
      renderEditor({ interaction: block('') });
      expect(button(tr.$tr('deletePairBtn', { number: 1 }))).toBeDisabled();
    });

    it('keeps the last pair when its delete button is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('deletePairBtn', { number: 1 })));
      await user.click(button(tr.$tr('deletePairBtn', { number: 1 })));
      expect(screen.getByText(tr.$tr('pairNumberLabel', { number: 1 }))).toBeInTheDocument();
      expect(screen.getByText('Capulet')).toBeInTheDocument();
    });
  });

  describe('adding a distractor', () => {
    it('opens an empty editor with a save button instead of adding a chip', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      expect(openTextarea()).toHaveValue('');
      expect(button(tr.$tr('saveDistractorBtn'))).toBeInTheDocument();
      expect(queryButton(tr.$tr('deleteDistractorBtn', { number: 2 }))).not.toBeInTheDocument();
    });

    it('hides the add button until the distractor is saved', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      expect(queryButton(tr.$tr('addDistractorBtn'))).not.toBeInTheDocument();
    });

    it('adds the written distractor to the pool on save', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Demetrius');
      await user.click(button(tr.$tr('saveDistractorBtn')));

      const pool = screen.getByRole('list', { name: tr.$tr('distractorsLabel') });
      expect(within(pool).getByText('Demetrius')).toBeInTheDocument();
      expect(latestBodyXml(emitted)).toContain('Demetrius');
      expect(button(tr.$tr('addDistractorBtn'))).toBeInTheDocument();
      expect(queryButton(tr.$tr('saveDistractorBtn'))).not.toBeInTheDocument();
    });

    it('emits nothing until the distractor is saved', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Demetrius');
      const before = emitted()['update:interaction'].length;
      await user.click(button(tr.$tr('saveDistractorBtn')));
      expect(emitted()['update:interaction'].length).toBeGreaterThan(before);
    });

    it('leaves a placeholder chip when the editor is closed before saving', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Demetrius');
      // Editing something else closes the unsaved editor without discarding it.
      await user.click(button(editPairItem(1, 1)));

      expect(screen.getByText(tr.$tr('newDistractorLabel'))).toBeInTheDocument();
      expect(button(tr.$tr('saveDistractorBtn'))).toBeInTheDocument();
      expect(queryButton(tr.$tr('addDistractorBtn'))).not.toBeInTheDocument();
    });

    it('reopens the placeholder chip with the written content intact', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Demetrius');
      await user.click(button(editPairItem(1, 1)));
      await user.click(button(tr.$tr('editNewDistractorLabel')));
      expect(openTextarea()).toHaveValue('Demetrius');
    });
  });

  describe('existing distractors', () => {
    it('opens a distractor for editing when its chip is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('editDistractorLabel', { number: 1 })));
      expect(openTextarea()).toHaveValue('Lysander');
    });

    it('opens a distractor whose content is blank', async () => {
      const user = userEvent.setup();
      renderEditor({ interaction: blockWithDecl(BLANK_DISTRACTOR_XML, ONE_PAIR_DECL_XML) });
      await user.click(button(tr.$tr('editDistractorLabel', { number: 1 })));
      expect(queryButton(tr.$tr('editDistractorLabel', { number: 1 }))).not.toBeInTheDocument();
      expect(openTextarea()).toHaveValue('');
    });

    it('writes edited distractor content into the emitted XML', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(tr.$tr('editDistractorLabel', { number: 1 })));
      await user.type(openTextarea(), '!');
      expect(latestBodyXml(emitted)).toContain('Lysander!');
    });

    it('removes the distractor when its delete button is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('deleteDistractorBtn', { number: 1 })));
      expect(screen.queryByText('Lysander')).not.toBeInTheDocument();
    });

    it('closes the open editor when an earlier distractor is deleted', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Demetrius');
      await user.click(button(tr.$tr('saveDistractorBtn')));
      await user.click(button(tr.$tr('editDistractorLabel', { number: 2 })));
      expect(openTextarea()).toHaveValue('Demetrius');

      await user.click(button(tr.$tr('deleteDistractorBtn', { number: 1 })));
      expect(openTextarea()).toBeUndefined();
    });
  });

  describe('view mode', () => {
    const viewProps = { mode: 'view' };

    it('renders the shuffled response pool exactly once per option', () => {
      renderEditor(viewProps);
      expect(screen.getByText(tr.$tr('responsePoolLabel'))).toBeInTheDocument();
      for (const content of POOL_CONTENTS) {
        expect(screen.getAllByText(content)).toHaveLength(1);
      }
    });

    it('hides the editing controls', () => {
      renderEditor(viewProps);
      expect(queryButton(tr.$tr('addPairBtn'))).not.toBeInTheDocument();
      expect(queryButton(tr.$tr('addDistractorBtn'))).not.toBeInTheDocument();
      expect(queryButton(tr.$tr('deletePairBtn', { number: 1 }))).not.toBeInTheDocument();
    });

    it('hides the correct answers when showAnswers is false', () => {
      renderEditor(viewProps);
      expect(screen.queryByText(tr.$tr('correctAnswersLabel'))).not.toBeInTheDocument();
    });

    it('lists each correct pair when showAnswers is true', () => {
      renderEditor({ ...viewProps, showAnswers: true });
      const answers = screen.getByRole('list', { name: tr.$tr('correctAnswersLabel') });
      expect(within(answers).getByText('Antonio')).toBeInTheDocument();
      expect(within(answers).getByText('Prospero')).toBeInTheDocument();
      expect(within(answers).queryByText('Lysander')).not.toBeInTheDocument();
    });

    it('opens no editor for a pair item', async () => {
      const user = userEvent.setup();
      renderEditor({ ...viewProps, showAnswers: true });
      const answers = screen.getByRole('list', { name: tr.$tr('correctAnswersLabel') });
      expect(queryButton(editPairItem(1, 1))).not.toBeInTheDocument();
      await user.click(within(answers).getByText('Antonio'));
      expect(openTextarea()).toBeUndefined();
    });
  });

  describe('emits', () => {
    it('emits update:interaction on mount in edit mode', () => {
      const { emitted } = renderEditor();
      const payload = emitted()['update:interaction'][0][0];
      expect(typeof payload.bodyXml).toBe('string');
      expect(Array.isArray(payload.responseDeclarations)).toBe(true);
    });

    it('emits update:interaction again after adding a pair', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      const before = emitted()['update:interaction'].length;
      await user.click(button(tr.$tr('addPairBtn')));
      expect(emitted()['update:interaction'].length).toBeGreaterThan(before);
    });

    it('does not emit update:interaction in view mode', () => {
      const { emitted } = renderEditor({ mode: 'view', showAnswers: true });
      expect(emitted()['update:interaction']).toBeFalsy();
    });
  });

  describe('validation', () => {
    const settleValidation = async () => {
      await nextTick();
      jest.advanceTimersByTime(400);
      await nextTick();
    };

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    it('shows no errors before any mutation', () => {
      renderEditor();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('surfaces the prompt and too-few-pairs errors once a mutation settles', async () => {
      const user = setupUser();
      renderEditor({ interaction: block('') });
      await user.click(button(tr.$tr('addPairBtn')));
      await settleValidation();
      expect(screen.getByText(tr.$tr('errorPromptRequired'))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('errorTooFewPairs'))).toBeInTheDocument();
    });

    it('flags a pair whose two members hold the same content', async () => {
      const user = setupUser();
      renderEditor({ interaction: block('') });
      for (const position of [1, 2]) {
        await user.click(button(editPairItem(1, position)));
        await user.type(openTextarea(), 'Kenya');
      }
      await settleValidation();
      expect(screen.getByText(tr.$tr('errorDuplicatePairContent'))).toBeInTheDocument();
    });

    it('flags a distractor saved with no content', async () => {
      const user = setupUser();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.click(button(tr.$tr('saveDistractorBtn')));
      await settleValidation();
      expect(screen.getByText(tr.$tr('errorEmptyChoiceContent'))).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('gives every icon button an accessible name', () => {
      renderEditor();
      expect(button(tr.$tr('deletePairBtn', { number: 1 }))).toHaveAccessibleName();
      expect(button(tr.$tr('deleteDistractorBtn', { number: 1 }))).toHaveAccessibleName();
    });

    it('opens a pair item from the keyboard', async () => {
      const user = userEvent.setup();
      renderEditor();
      button(editPairItem(2, 1)).focus();
      await user.keyboard('{Enter}');
      expect(queryButton(editPairItem(2, 1))).not.toBeInTheDocument();
    });

    it('adds a pair from the keyboard', async () => {
      const user = userEvent.setup();
      renderEditor();
      button(tr.$tr('addPairBtn')).focus();
      await user.keyboard('{Enter}');
      expect(screen.getByText(tr.$tr('pairNumberLabel', { number: 3 }))).toBeInTheDocument();
    });
  });

  describe('graceful fallback', () => {
    it('renders the default single blank pair when bodyXml is empty', () => {
      renderEditor({ interaction: block('') });
      expect(screen.getByText(tr.$tr('pairNumberLabel', { number: 1 }))).toBeInTheDocument();
      expect(screen.queryByText(tr.$tr('pairNumberLabel', { number: 2 }))).not.toBeInTheDocument();
      expect(button(tr.$tr('addPairBtn'))).toBeInTheDocument();
    });

    it('renders the default state when the XML is malformed', () => {
      renderEditor({ interaction: block('<unclosed') });
      expect(screen.getByText(tr.$tr('pairNumberLabel', { number: 1 }))).toBeInTheDocument();
      expect(screen.queryByText(tr.$tr('pairNumberLabel', { number: 2 }))).not.toBeInTheDocument();
    });
  });
});
