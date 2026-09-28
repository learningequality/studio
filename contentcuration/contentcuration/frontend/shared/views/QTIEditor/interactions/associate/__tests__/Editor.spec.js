import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import AssociateEditor from '../Editor.vue';

import {
  ASSOCIATE_XML,
  ASSOCIATE_DECL_XML,
  mockInteractionBlock as block,
  mockInteractionBlockWithDecl as blockWithDecl,
} from '../../../utils/testingFixtures';
import { QuestionType } from '../../../constants';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');

let mockWindowIsLarge = true;
let mockWindowIsSmall = false;
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({
      windowIsLarge: ref(mockWindowIsLarge),
      windowIsSmall: ref(mockWindowIsSmall),
    }),
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

// Antonio is paired twice, so its match-max is 2.
const SHARED_CHOICE_XML = `<qti-associate-interaction response-identifier="RESPONSE">
  <qti-prompt><p>Match each character to his adversary.</p></qti-prompt>
  <qti-simple-associable-choice identifier="choice_aaa11111" match-max="2">Antonio</qti-simple-associable-choice>
  <qti-simple-associable-choice identifier="choice_bbb22222" match-max="1">Prospero</qti-simple-associable-choice>
  <qti-simple-associable-choice identifier="choice_ccc33333" match-max="1">Capulet</qti-simple-associable-choice>
</qti-associate-interaction>`;

const SHARED_CHOICE_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
  <qti-correct-response>
    <qti-value>choice_aaa11111 choice_bbb22222</qti-value>
    <qti-value>choice_aaa11111 choice_ccc33333</qti-value>
  </qti-correct-response>
</qti-response-declaration>`;

// The mock TipTapEditor renders a <textarea> only for the card currently open.
const openTextarea = () => screen.queryAllByRole('textbox').find(el => el.tagName === 'TEXTAREA');

const button = name => screen.getByRole('button', { name });
const queryButton = name => screen.queryByRole('button', { name });

const editPairItem = (number, position) => tr.$tr('editPairItemLabel', { number, position });

const renderEditor = (props = {}) =>
  render(AssociateEditor, {
    props: {
      mode: 'edit',
      questionType: QuestionType.ASSOCIATE,
      interaction: blockWithDecl(ASSOCIATE_XML, ASSOCIATE_DECL_XML),
      ...props,
    },
    routes: new VueRouter(),
  });

const updates = emitted => emitted()['update:interaction'] || [];
const latestBodyXml = emitted => updates(emitted).at(-1)[0].bodyXml;

describe('AssociateEditor', () => {
  beforeEach(() => {
    mockWindowIsLarge = true;
    mockWindowIsSmall = false;
  });

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

  describe('pair layout below the large breakpoint', () => {
    const pairRows = () =>
      within(screen.getByRole('list', { name: tr.$tr('correctPairsLabel') })).getAllByRole(
        'listitem',
      );

    it('stacks only the row whose editor is open', async () => {
      mockWindowIsLarge = false;
      const user = userEvent.setup();
      // Pair 1 item 1 opens on mount.
      renderEditor();
      const [first, second] = pairRows();
      expect(first).toHaveClass('is-stacked');
      expect(second).not.toHaveClass('is-stacked');

      await user.click(button(editPairItem(2, 1)));
      expect(first).not.toHaveClass('is-stacked');
      expect(second).toHaveClass('is-stacked');
    });

    it('stacks no row on a large screen', () => {
      renderEditor();
      for (const row of pairRows()) {
        expect(row).not.toHaveClass('is-stacked');
      }
    });

    it('stacks every row on a small screen, open or not', () => {
      mockWindowIsLarge = false;
      mockWindowIsSmall = true;
      renderEditor();
      for (const row of pairRows()) {
        expect(row).toHaveClass('is-stacked');
      }
    });
  });

  describe('adding a distractor', () => {
    // The fixture pool holds one distractor, so a new one is number 2.
    const removeNewDistractor = tr.$tr('deleteDistractorBtn', { number: 2 });

    it('opens an empty editor with a remove button, without adding a chip', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      expect(openTextarea()).toHaveValue('');
      expect(button(removeNewDistractor)).toBeInTheDocument();

      const pool = screen.getByRole('list', { name: tr.$tr('distractorsLabel') });
      expect(within(pool).getAllByRole('listitem')).toHaveLength(1);
    });

    it('keeps the add button available while one is being written', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      expect(button(tr.$tr('addDistractorBtn'))).toBeInTheDocument();
    });

    it('adds the written distractor to the pool when its editor closes', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Demetrius');
      const before = updates(emitted).length;
      // Editing something else closes the editor, which is what commits it.
      await user.click(button(editPairItem(1, 1)));

      const pool = screen.getByRole('list', { name: tr.$tr('distractorsLabel') });
      expect(within(pool).getByText('Demetrius')).toBeInTheDocument();
      expect(latestBodyXml(emitted)).toContain('Demetrius');
      expect(updates(emitted).length).toBeGreaterThan(before);
    });

    it('commits the written distractor and focuses a fresh editor when add is clicked again', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Demetrius');
      await user.click(button(tr.$tr('addDistractorBtn')));

      const pool = screen.getByRole('list', { name: tr.$tr('distractorsLabel') });
      expect(within(pool).getByText('Demetrius')).toBeInTheDocument();
      expect(openTextarea()).toHaveValue('');
      expect(openTextarea()).toHaveFocus();
    });

    it('focuses the editor again when the add button is clicked with nothing written', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.click(button(tr.$tr('addDistractorBtn')));

      expect(openTextarea()).toHaveFocus();
    });

    it('drops the new distractor when its editor closes with no content', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.click(button(editPairItem(1, 1)));

      const pool = screen.getByRole('list', { name: tr.$tr('distractorsLabel') });
      expect(within(pool).getAllByRole('listitem')).toHaveLength(1);
    });

    it('discards the written distractor when its remove button is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Demetrius');
      await user.click(button(removeNewDistractor));

      expect(screen.queryByText('Demetrius')).not.toBeInTheDocument();
      expect(button(tr.$tr('addDistractorBtn'))).toBeInTheDocument();
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
      await user.click(button(editPairItem(1, 1)));
      await user.click(button(tr.$tr('editDistractorLabel', { number: 2 })));
      expect(openTextarea()).toHaveValue('Demetrius');

      await user.click(button(tr.$tr('deleteDistractorBtn', { number: 1 })));
      expect(openTextarea()).toBeUndefined();
      expect(screen.getByText('Demetrius')).toBeInTheDocument();
    });

    it('drops a distractor whose content is cleared before its editor closes', async () => {
      const user = userEvent.setup();
      renderEditor({ interaction: blockWithDecl(BLANK_DISTRACTOR_XML, ONE_PAIR_DECL_XML) });
      await user.click(button(tr.$tr('editDistractorLabel', { number: 1 })));
      await user.click(button(editPairItem(1, 1)));

      const pool = screen.getByRole('list', { name: tr.$tr('distractorsLabel') });
      expect(within(pool).queryAllByRole('listitem')).toHaveLength(0);
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

    it('repeats an option in the pool once per association it allows', () => {
      renderEditor({
        ...viewProps,
        interaction: blockWithDecl(SHARED_CHOICE_XML, SHARED_CHOICE_DECL_XML),
      });
      expect(screen.getAllByText('Antonio')).toHaveLength(2);
      expect(screen.getAllByText('Prospero')).toHaveLength(1);
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
    it('does not emit update:interaction on mount in edit mode', () => {
      const { emitted } = renderEditor();
      expect(updates(emitted)).toHaveLength(0);
    });

    it('emits update:interaction after adding a pair', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(tr.$tr('addPairBtn')));
      const payload = updates(emitted).at(-1)[0];
      expect(typeof payload.bodyXml).toBe('string');
      expect(Array.isArray(payload.responseDeclarations)).toBe(true);
    });

    it('does not emit update:interaction when moving between editors changes nothing', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      // Pair 1 item 1 opens on mount; moving the open editor is not a content change.
      await user.click(button(editPairItem(1, 2)));
      await user.click(button(editPairItem(2, 1)));
      expect(updates(emitted)).toHaveLength(0);
    });

    it('does not emit update:interaction in view mode', () => {
      const { emitted } = renderEditor({ mode: 'view', showAnswers: true });
      expect(updates(emitted)).toHaveLength(0);
    });
  });

  describe('validation', () => {
    it('shows no errors for a question that is already complete', () => {
      renderEditor();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('reports the prompt and too-few-pairs errors as soon as the state changes', async () => {
      const user = userEvent.setup();
      renderEditor({ interaction: block('') });
      await user.click(button(tr.$tr('addPairBtn')));
      await nextTick();
      expect(screen.getByText(tr.$tr('errorPromptRequired'))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('errorTooFewPairs'))).toBeInTheDocument();
    });

    it('flags a pair whose two members hold the same content', async () => {
      const user = userEvent.setup();
      renderEditor({ interaction: block('') });
      for (const position of [1, 2]) {
        await user.click(button(editPairItem(1, position)));
        await user.type(openTextarea(), 'Kenya');
      }
      await nextTick();
      expect(screen.getByText(tr.$tr('errorDuplicatePairContent'))).toBeInTheDocument();
    });

    it('flags a distractor parsed with no content', async () => {
      renderEditor({ interaction: blockWithDecl(BLANK_DISTRACTOR_XML, ONE_PAIR_DECL_XML) });
      await nextTick();
      expect(screen.getByText(tr.$tr('errorEmptyChoiceContent'))).toBeInTheDocument();
    });

    it('flags a distractor repeating a paired item in both the pool and the pair row', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Antonio');
      await user.click(button(editPairItem(1, 2)));
      await nextTick();
      const distractors = screen.getByRole('list', { name: tr.$tr('distractorsLabel') });
      const pairs = screen.getByRole('list', { name: tr.$tr('correctPairsLabel') });
      expect(
        within(distractors).getByText(tr.$tr('errorDuplicateDistractorContent')),
      ).toBeInTheDocument();
      expect(
        within(pairs).getByText(tr.$tr('errorDuplicateDistractorContent')),
      ).toBeInTheDocument();
    });

    it('stacks both faults on a pair that repeats itself and a distractor', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(editPairItem(1, 2)));
      await user.clear(openTextarea());
      await user.type(openTextarea(), 'Antonio');
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Antonio');
      await user.click(button(editPairItem(2, 1)));
      await nextTick();
      const pairs = screen.getByRole('list', { name: tr.$tr('correctPairsLabel') });
      expect(within(pairs).getByText(tr.$tr('errorDuplicatePairContent'))).toBeInTheDocument();
      expect(
        within(pairs).getByText(tr.$tr('errorDuplicateDistractorContent')),
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
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

    it('moves focus to the last row when the last pair is deleted', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addPairBtn')));
      await user.click(button(tr.$tr('deletePairBtn', { number: 3 })));
      await nextTick();
      expect(button(tr.$tr('deletePairBtn', { number: 2 }))).toHaveFocus();
    });

    it('moves focus to the add pair button when no removable pair is left', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('deletePairBtn', { number: 1 })));
      await nextTick();
      expect(button(tr.$tr('addPairBtn'))).toHaveFocus();
    });

    it('moves focus to the chip that takes a deleted distractor\u2019s place', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Demetrius');
      await user.click(button(editPairItem(1, 1)));
      await user.click(button(tr.$tr('deleteDistractorBtn', { number: 1 })));
      await nextTick();
      expect(button(tr.$tr('deleteDistractorBtn', { number: 1 }))).toHaveFocus();
    });

    it('moves focus to the add distractor button when the pool empties', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('deleteDistractorBtn', { number: 1 })));
      await nextTick();
      expect(button(tr.$tr('addDistractorBtn'))).toHaveFocus();
    });

    // Closing the editor already drops a blank distractor, so the delete press finds
    // nothing left to remove — and must still place the focus it is about to lose.
    it('moves focus on when an open blank distractor is deleted', async () => {
      const user = userEvent.setup();
      renderEditor({ interaction: blockWithDecl(BLANK_DISTRACTOR_XML, ONE_PAIR_DECL_XML) });
      await user.click(button(tr.$tr('editDistractorLabel', { number: 1 })));
      await user.click(button(tr.$tr('deleteDistractorBtn', { number: 1 })));
      await nextTick();
      expect(button(tr.$tr('addDistractorBtn'))).toHaveFocus();
    });

    it('moves focus to the add distractor button when a draft is discarded', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.click(button(tr.$tr('deleteDistractorBtn', { number: 2 })));
      await nextTick();
      expect(button(tr.$tr('addDistractorBtn'))).toHaveFocus();
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
