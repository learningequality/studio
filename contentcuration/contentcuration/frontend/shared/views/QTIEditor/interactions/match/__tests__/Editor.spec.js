import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
import MatchEditor from '../Editor.vue';

import {
  MATCH_XML,
  MATCH_DECL_XML,
  mockInteractionBlock as block,
  mockInteractionBlockWithDecl as blockWithDecl,
} from '../../../utils/testingFixtures';
import { QuestionType, ValidationError } from '../../../constants';
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

const ONE_ROW_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">
  <qti-correct-response>
    <qti-value>row_dog choice_mammal</qti-value>
  </qti-correct-response>
</qti-response-declaration>`;

// The second response is named by no value, so it is a blank distractor.
const BLANK_DISTRACTOR_XML = `<qti-match-interaction response-identifier="RESPONSE">
  <qti-prompt><p>Match each animal to its class.</p></qti-prompt>
  <qti-simple-match-set>
    <qti-simple-associable-choice identifier="row_dog" match-max="1">Dog</qti-simple-associable-choice>
  </qti-simple-match-set>
  <qti-simple-match-set>
    <qti-simple-associable-choice identifier="choice_mammal" match-max="1">Mammal</qti-simple-associable-choice>
    <qti-simple-associable-choice identifier="choice_blank" match-max="1"></qti-simple-associable-choice>
  </qti-simple-match-set>
</qti-match-interaction>`;

const IMAGE_ANSWER_XML = `<qti-match-interaction response-identifier="RESPONSE">
  <qti-prompt><p>Match each animal to its class.</p></qti-prompt>
  <qti-simple-match-set>
    <qti-simple-associable-choice identifier="row_dog" match-max="1">Dog</qti-simple-associable-choice>
  </qti-simple-match-set>
  <qti-simple-match-set>
    <qti-simple-associable-choice identifier="choice_mammal" match-max="1"><img src="mammal.png" alt="A mammal"/></qti-simple-associable-choice>
  </qti-simple-match-set>
</qti-match-interaction>`;

// Mammal serves both rows; Reptile serves none.
const SHARED_ANSWER_XML = `<qti-match-interaction response-identifier="RESPONSE">
  <qti-prompt><p>Match each animal to its class.</p></qti-prompt>
  <qti-simple-match-set>
    <qti-simple-associable-choice identifier="row_dog" match-max="1">Dog</qti-simple-associable-choice>
    <qti-simple-associable-choice identifier="row_cat" match-max="1">Cat</qti-simple-associable-choice>
  </qti-simple-match-set>
  <qti-simple-match-set>
    <qti-simple-associable-choice identifier="choice_mammal" match-max="2">Mammal</qti-simple-associable-choice>
    <qti-simple-associable-choice identifier="choice_reptile" match-max="1">Reptile</qti-simple-associable-choice>
  </qti-simple-match-set>
</qti-match-interaction>`;

const SHARED_ANSWER_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">
  <qti-correct-response>
    <qti-value>row_dog choice_mammal</qti-value>
    <qti-value>row_cat choice_mammal</qti-value>
  </qti-correct-response>
</qti-response-declaration>`;

const BLANK_ANSWER_XML = `<qti-match-interaction response-identifier="RESPONSE">
  <qti-prompt><p>Match each animal to its class.</p></qti-prompt>
  <qti-simple-match-set>
    <qti-simple-associable-choice identifier="row_dog" match-max="1">Dog</qti-simple-associable-choice>
  </qti-simple-match-set>
  <qti-simple-match-set>
    <qti-simple-associable-choice identifier="choice_mammal" match-max="1"></qti-simple-associable-choice>
  </qti-simple-match-set>
</qti-match-interaction>`;

// The mock TipTapEditor renders a <textarea> only for the card currently open.
const openTextareas = () =>
  screen.queryAllByRole('textbox').filter(el => el.tagName === 'TEXTAREA');
const openTextarea = () => openTextareas()[0];

const button = name => screen.getByRole('button', { name });
const queryButton = name => screen.queryByRole('button', { name });

const editRow = number => tr.$tr('editRowLabel', { number });
const deleteRow = number => tr.$tr('deleteRowBtn', { number });
const editMatch = (number, position) => tr.$tr('editMatchLabel', { number, position });
const deleteMatch = (number, position) => tr.$tr('deleteMatchBtn', { number, position });
const addMatch = number => tr.$tr('addMatchLabel', { number });

const rowsList = () => screen.getByRole('list', { name: tr.$tr('matchingRowsLabel') });
// Each row holds its own answer list, so only the outer list's direct items are rows.
const rows = () => {
  const list = rowsList();
  return within(list)
    .getAllByRole('listitem')
    .filter(el => el.parentElement === list);
};
const rowAnswers = number =>
  screen.getByRole('list', { name: tr.$tr('rowAnswersLabel', { number }) });
const answerItems = number => within(rowAnswers(number)).queryAllByRole('listitem');
const distractorList = () => screen.getByRole('list', { name: tr.$tr('distractorsLabel') });

const renderEditor = (props = {}) =>
  render(MatchEditor, {
    props: {
      mode: 'edit',
      questionType: QuestionType.MATCH,
      interaction: blockWithDecl(MATCH_XML, MATCH_DECL_XML),
      ...props,
    },
    routes: new VueRouter(),
  });

// Writes a new answer into a row, committing it by opening the question prompt.
const writeAnswer = async (user, rowNumber, text) => {
  await user.click(rowAnswers(rowNumber));
  await user.type(openTextarea(), text);
  await user.click(button(tr.$tr('editQuestionLabel')));
};

const updates = emitted => emitted()['update:interaction'] || [];
const latestBodyXml = emitted => updates(emitted).at(-1)[0].bodyXml;
const latestErrorCodes = emitted =>
  emitted()
    ['update:errors'].at(-1)[0]
    .map(e => e.code);

describe('MatchEditor', () => {
  beforeEach(() => {
    mockWindowIsLarge = true;
    mockWindowIsSmall = false;
  });

  describe('edit mode rendering', () => {
    it('renders the prompt text from the XML', () => {
      renderEditor();
      expect(screen.getByText(/Match each animal/)).toBeInTheDocument();
    });

    it('renders every row prompt from the XML', () => {
      renderEditor();
      for (const content of ['Dog', 'Eagle', 'Frog']) {
        expect(within(rowsList()).getByText(content)).toBeInTheDocument();
      }
      expect(rows()).toHaveLength(3);
    });

    it('numbers no row as a pair', () => {
      renderEditor();
      expect(screen.queryByText(tr.$tr('pairNumberLabel', { number: 1 }))).not.toBeInTheDocument();
    });

    it('opens the first row prompt for editing when the question prompt is written', () => {
      renderEditor();
      expect(queryButton(editRow(1))).not.toBeInTheDocument();
      expect(openTextarea()).toHaveValue('Dog');
    });

    it('opens the question prompt for editing when it is blank', () => {
      renderEditor({ interaction: block('') });
      expect(queryButton(tr.$tr('editQuestionLabel'))).not.toBeInTheDocument();
      expect(button(editRow(1))).toBeInTheDocument();
    });
  });

  describe('editing content', () => {
    it('moves the open editor to the row prompt that is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(editRow(2)));
      expect(openTextarea()).toHaveValue('Eagle');
      expect(button(editRow(1))).toBeInTheDocument();
    });

    it('writes the typed row prompt into the emitted XML', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(editRow(3)));
      await user.type(openTextarea(), 'let');
      expect(latestBodyXml(emitted)).toContain('Froglet');
    });

    it('writes the typed question prompt into the emitted XML', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(tr.$tr('editQuestionLabel')));
      await user.type(openTextarea(), 'Which class?');
      expect(latestBodyXml(emitted)).toContain('Which class?');
    });
  });

  describe('rows', () => {
    it('appends a row and opens its prompt when add row is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addRowBtn')));
      expect(rows()).toHaveLength(4);
      expect(queryButton(editRow(4))).not.toBeInTheDocument();
      expect(openTextarea()).toHaveValue('');
    });

    it('removes the row when its delete button is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(deleteRow(1)));
      expect(screen.queryByText('Dog')).not.toBeInTheDocument();
      expect(rows()).toHaveLength(2);
    });

    it('disables the delete button when a single row remains', () => {
      renderEditor({ interaction: block('') });
      expect(button(deleteRow(1))).toBeDisabled();
    });

    it('keeps the last row when its delete button is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(deleteRow(1)));
      await user.click(button(deleteRow(1)));
      await user.click(button(deleteRow(1)));
      expect(rows()).toHaveLength(1);
      expect(screen.getByText('Frog')).toBeInTheDocument();
    });
  });

  describe('row layout below the large breakpoint', () => {
    it('stacks only the row whose editor is open', async () => {
      mockWindowIsLarge = false;
      const user = userEvent.setup();
      // Row 1's prompt opens on mount.
      renderEditor();
      const [first, second] = rows();
      expect(first).toHaveClass('is-stacked');
      expect(second).not.toHaveClass('is-stacked');

      await user.click(button(editRow(2)));
      expect(first).not.toHaveClass('is-stacked');
      expect(second).toHaveClass('is-stacked');
    });

    it('stacks no row on a large screen', () => {
      renderEditor();
      for (const row of rows()) {
        expect(row).not.toHaveClass('is-stacked');
      }
    });

    it('stacks every row on a small screen, open or not', () => {
      mockWindowIsLarge = false;
      mockWindowIsSmall = true;
      renderEditor();
      for (const row of rows()) {
        expect(row).toHaveClass('is-stacked');
      }
    });

    it('heads the two columns once above the rows while they sit side by side', () => {
      renderEditor();
      expect(screen.getAllByText(tr.$tr('promptColumnLabel'))).toHaveLength(1);
      expect(screen.getAllByText(tr.$tr('answersColumnLabel'))).toHaveLength(1);
      expect(within(rowsList()).queryByText(tr.$tr('promptColumnLabel'))).not.toBeInTheDocument();
    });

    it('labels the prompt and answers within each stacked row instead', () => {
      mockWindowIsLarge = false;
      mockWindowIsSmall = true;
      renderEditor();
      for (const row of rows()) {
        expect(within(row).getByText(tr.$tr('promptColumnLabel'))).toBeInTheDocument();
        expect(within(row).getByText(tr.$tr('answersColumnLabel'))).toBeInTheDocument();
      }
      expect(screen.getAllByText(tr.$tr('promptColumnLabel'))).toHaveLength(rows().length);
    });
  });

  describe('row answers', () => {
    it("lists each row's answers under that row", () => {
      renderEditor();
      expect(answerItems(1)).toHaveLength(1);
      expect(within(rowAnswers(1)).getByText('Mammal')).toBeInTheDocument();
      expect(within(rowAnswers(2)).getByText('Bird')).toBeInTheDocument();
      expect(within(rowAnswers(3)).getByText('Amphibian')).toBeInTheDocument();
    });

    it('opens an answer when its chip is clicked and writes the typing into the XML', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(editMatch(2, 1)));
      expect(openTextarea()).toHaveValue('Bird');
      await user.type(openTextarea(), 's');
      expect(latestBodyXml(emitted)).toContain('Birds');
    });

    it('removes the answer when its delete button is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await writeAnswer(user, 1, 'Canine');
      await user.click(button(deleteMatch(1, 1)));
      expect(screen.queryByText('Mammal')).not.toBeInTheDocument();
      expect(answerItems(1)).toHaveLength(1);
    });

    it("disables the delete button of a row's only answer", () => {
      renderEditor();
      expect(button(deleteMatch(1, 1))).toBeDisabled();
    });

    it('shows a placeholder in a blank answer', () => {
      renderEditor({ interaction: blockWithDecl(BLANK_ANSWER_XML, ONE_ROW_DECL_XML) });
      expect(within(rowAnswers(1)).getByText(tr.$tr('answerPlaceholder'))).toBeInTheDocument();
    });

    it("opens an empty draft, without adding a chip, when the row's answer area is clicked", async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(rowAnswers(2));
      expect(openTextarea()).toHaveValue('');
      expect(answerItems(2)).toHaveLength(1);
    });

    it('adds the written draft to its row when Save is pressed', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(rowAnswers(2));
      await user.type(openTextarea(), 'Aves');
      expect(answerItems(2)).toHaveLength(1);
      await user.click(button(tr.$tr('saveChipBtn')));

      expect(openTextarea()).toBeUndefined();
      expect(within(rowAnswers(2)).getByText('Aves')).toBeInTheDocument();
      expect(latestBodyXml(emitted)).toContain('Aves');
    });

    it('adds the written draft to its row when another editor opens', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(rowAnswers(2));
      await user.type(openTextarea(), 'Aves');
      await user.click(button(editRow(1)));

      expect(within(rowAnswers(2)).getByText('Aves')).toBeInTheDocument();
      expect(answerItems(2)).toHaveLength(2);
      expect(latestBodyXml(emitted)).toContain('Aves');
    });

    it('drops an empty draft when another editor opens', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(rowAnswers(2));
      await user.click(button(editRow(1)));
      expect(answerItems(2)).toHaveLength(1);
    });

    it('opens a draft from the keyboard', async () => {
      const user = userEvent.setup();
      renderEditor();
      button(addMatch(2)).focus();
      await user.keyboard('{Enter}');
      expect(openTextarea()).toHaveValue('');
      expect(button(deleteMatch(2, 2))).toBeInTheDocument();
    });

    it('keeps an answer open, and opens no draft, when its editor is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(editMatch(1, 1)));
      await user.click(openTextarea());
      expect(openTextareas()).toHaveLength(1);
      expect(openTextarea()).toHaveValue('Mammal');
    });

    it('drops an answer left blank when its editor closes', async () => {
      const user = userEvent.setup();
      renderEditor();
      await writeAnswer(user, 1, 'Canine');
      await user.click(button(editMatch(1, 1)));
      await user.clear(openTextarea());
      await user.click(button(editRow(2)));
      expect(answerItems(1)).toHaveLength(1);
      expect(within(rowAnswers(1)).getByText('Canine')).toBeInTheDocument();
    });

    it("keeps a row's only answer when its editor closes blank", async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addRowBtn')));
      await user.click(button(editMatch(4, 1)));
      await user.click(button(editRow(1)));
      expect(answerItems(4)).toHaveLength(1);
    });

    it('keeps an image-only answer when its editor closes', async () => {
      const user = userEvent.setup();
      renderEditor({ interaction: blockWithDecl(IMAGE_ANSWER_XML, ONE_ROW_DECL_XML) });
      await user.click(button(editMatch(1, 1)));
      await user.click(button(editRow(1)));
      expect(answerItems(1)).toHaveLength(1);
    });
  });

  describe('adding a distractor', () => {
    // The fixture holds one distractor, so a new one is number 2.
    const removeNewDistractor = tr.$tr('deleteDistractorBtn', { number: 2 });

    it('opens an empty editor with a remove button, without adding a chip', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      expect(openTextarea()).toHaveValue('');
      expect(button(removeNewDistractor)).toBeInTheDocument();
      expect(within(distractorList()).getAllByRole('listitem')).toHaveLength(1);
    });

    it('adds the written distractor to the pool when its editor closes', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Fish');
      await user.click(button(editRow(1)));

      expect(within(distractorList()).getByText('Fish')).toBeInTheDocument();
      expect(latestBodyXml(emitted)).toContain('Fish');
    });

    it('commits the written distractor and focuses a fresh editor when add is clicked again', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Fish');
      await user.click(button(tr.$tr('addDistractorBtn')));

      expect(within(distractorList()).getByText('Fish')).toBeInTheDocument();
      expect(openTextarea()).toHaveValue('');
      expect(openTextarea()).toHaveFocus();
    });

    it('drops the new distractor when its editor closes with no content', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.click(button(editRow(1)));
      expect(within(distractorList()).getAllByRole('listitem')).toHaveLength(1);
    });

    it('discards the written distractor when its remove button is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Fish');
      await user.click(button(removeNewDistractor));

      expect(screen.queryByText('Fish')).not.toBeInTheDocument();
      expect(button(tr.$tr('addDistractorBtn'))).toBeInTheDocument();
    });
  });

  describe('existing distractors', () => {
    it('opens a distractor for editing when its chip is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('editDistractorLabel', { number: 1 })));
      expect(openTextarea()).toHaveValue('Reptile');
    });

    it('opens a distractor whose content is blank', async () => {
      const user = userEvent.setup();
      renderEditor({ interaction: blockWithDecl(BLANK_DISTRACTOR_XML, ONE_ROW_DECL_XML) });
      await user.click(button(tr.$tr('editDistractorLabel', { number: 1 })));
      expect(queryButton(tr.$tr('editDistractorLabel', { number: 1 }))).not.toBeInTheDocument();
      expect(openTextarea()).toHaveValue('');
    });

    it('writes edited distractor content into the emitted XML', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(tr.$tr('editDistractorLabel', { number: 1 })));
      await user.type(openTextarea(), 's');
      expect(latestBodyXml(emitted)).toContain('Reptiles');
    });

    it('removes the distractor when its delete button is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('deleteDistractorBtn', { number: 1 })));
      expect(screen.queryByText('Reptile')).not.toBeInTheDocument();
    });

    it('closes the open editor when an earlier distractor is deleted', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Fish');
      await user.click(button(editRow(1)));
      await user.click(button(tr.$tr('editDistractorLabel', { number: 2 })));
      expect(openTextarea()).toHaveValue('Fish');

      await user.click(button(tr.$tr('deleteDistractorBtn', { number: 1 })));
      expect(openTextarea()).toBeUndefined();
      expect(screen.getByText('Fish')).toBeInTheDocument();
    });

    it('drops a distractor whose content is cleared before its editor closes', async () => {
      const user = userEvent.setup();
      renderEditor({ interaction: blockWithDecl(BLANK_DISTRACTOR_XML, ONE_ROW_DECL_XML) });
      await user.click(button(tr.$tr('editDistractorLabel', { number: 1 })));
      await user.click(button(editRow(1)));
      expect(within(distractorList()).queryAllByRole('listitem')).toHaveLength(0);
    });
  });

  describe('removing while another editor is open', () => {
    it('commits a draft to the row it was written in when an earlier row is deleted', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(rowAnswers(2));
      await user.type(openTextarea(), 'Aves');
      await user.click(button(deleteRow(1)));

      expect(within(rows()[0]).getByText('Eagle')).toBeInTheDocument();
      expect(within(rowAnswers(1)).getByText('Aves')).toBeInTheDocument();
    });

    it('closes an open answer, keeping its content, when an earlier answer is deleted', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(rowAnswers(1));
      await user.type(openTextarea(), 'Canine');
      await user.click(button(editRow(2)));
      await user.click(button(editMatch(1, 2)));
      expect(openTextarea()).toHaveValue('Canine');

      await user.click(button(deleteMatch(1, 1)));
      expect(openTextarea()).toBeUndefined();
      expect(within(rowAnswers(1)).getByText('Canine')).toBeInTheDocument();
      expect(screen.queryByText('Mammal')).not.toBeInTheDocument();
    });

    it("keeps a row's last answer when another is deleted while a blank one is open", async () => {
      const user = userEvent.setup();
      renderEditor();
      await writeAnswer(user, 1, 'Canine');
      await user.click(button(editMatch(1, 1)));
      await user.clear(openTextarea());

      await user.click(button(deleteMatch(1, 2)));
      expect(answerItems(1)).toHaveLength(1);
      expect(within(rowAnswers(1)).getByText('Canine')).toBeInTheDocument();
    });

    it("commits a draft and opens a fresh one when another row's answer area is clicked", async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(rowAnswers(1));
      await user.type(openTextarea(), 'Canine');
      await user.click(rowAnswers(2));

      expect(within(rowAnswers(1)).getByText('Canine')).toBeInTheDocument();
      expect(openTextareas()).toHaveLength(1);
      expect(openTextarea()).toHaveValue('');
      expect(button(deleteMatch(2, 2))).toBeInTheDocument();
    });
  });

  describe('leaving edit mode', () => {
    it('discards a written draft rather than committing it', async () => {
      const user = userEvent.setup();
      const { emitted, updateProps } = renderEditor();
      await user.click(rowAnswers(1));
      await user.type(openTextarea(), 'Canine');
      await updateProps({ mode: 'view' });
      await updateProps({ mode: 'edit' });

      expect(screen.queryByText('Canine')).not.toBeInTheDocument();
      expect(updates(emitted).some(([payload]) => payload.bodyXml.includes('Canine'))).toBe(false);
    });

    it('discards a written distractor draft and reopens with no distractor editor', async () => {
      const user = userEvent.setup();
      const { emitted, updateProps } = renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Fish');
      await updateProps({ mode: 'view' });
      expect(openTextareas()).toHaveLength(0);
      await updateProps({ mode: 'edit' });

      expect(screen.queryByText('Fish')).not.toBeInTheDocument();
      expect(within(distractorList()).getAllByRole('listitem')).toHaveLength(1);
      expect(button(tr.$tr('addDistractorBtn'))).toBeInTheDocument();
      expect(updates(emitted).some(([payload]) => payload.bodyXml.includes('Fish'))).toBe(false);
    });
  });

  describe('validation', () => {
    it('shows no errors for a question that is already complete', () => {
      renderEditor();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('reports the prompt and too-few-rows errors as soon as the state changes', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor({ interaction: block('') });
      await user.click(button(tr.$tr('addRowBtn')));
      await nextTick();
      expect(screen.getByText(tr.$tr('errorPromptRequired'))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('errorTooFewRows'))).toBeInTheDocument();

      expect(latestErrorCodes(emitted)).toEqual(
        expect.arrayContaining([ValidationError.PROMPT_REQUIRED, ValidationError.TOO_FEW_ROWS]),
      );
    });

    it('flags a row whose prompt is blank in that row', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addRowBtn')));
      await nextTick();
      expect(within(rows()[3]).getByText(tr.$tr('errorEmptyRowContent'))).toBeInTheDocument();
      expect(within(rows()[0]).queryByRole('alert')).not.toBeInTheDocument();
    });

    it('flags a row left without an answer in that row', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(editMatch(2, 1)));
      await user.clear(openTextarea());
      await user.click(button(editRow(1)));
      await nextTick();
      expect(within(rows()[1]).getByText(tr.$tr('errorRowWithoutMatch'))).toBeInTheDocument();
      expect(within(rows()[0]).queryByRole('alert')).not.toBeInTheDocument();
    });

    it('flags both rows that repeat a prompt', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(editRow(2)));
      await user.clear(openTextarea());
      await user.type(openTextarea(), 'Dog');
      await nextTick();
      for (const row of rows().slice(0, 2)) {
        expect(within(row).getByText(tr.$tr('errorDuplicateRowContent'))).toBeInTheDocument();
      }
      expect(within(rows()[2]).queryByRole('alert')).not.toBeInTheDocument();
    });

    it('flags each answer a row repeats', async () => {
      const user = userEvent.setup();
      renderEditor();
      await writeAnswer(user, 1, 'Mammal');
      expect(within(rowAnswers(1)).getAllByText(tr.$tr('errorDuplicateMatchContent'))).toHaveLength(
        2,
      );
    });

    it('flags an answer parsed with no content', () => {
      renderEditor({ interaction: blockWithDecl(BLANK_ANSWER_XML, ONE_ROW_DECL_XML) });
      expect(
        within(rowAnswers(1)).getByText(tr.$tr('errorEmptyChoiceContent')),
      ).toBeInTheDocument();
    });

    it('flags a distractor repeating an answer on both the distractor and the answer', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Mammal');
      await user.click(button(editRow(1)));
      await nextTick();
      expect(
        within(distractorList()).getByText(tr.$tr('errorDuplicateDistractorContent')),
      ).toBeInTheDocument();
      expect(
        within(rowAnswers(1)).getByText(tr.$tr('errorDuplicateDistractorContent')),
      ).toBeInTheDocument();
      expect(within(rowAnswers(2)).queryByRole('alert')).not.toBeInTheDocument();
    });

    it('holds the answer a distractor repeats unflagged until the distractor closes', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('editDistractorLabel', { number: 1 })));
      await user.clear(openTextarea());
      await user.type(openTextarea(), 'Mammal');
      await nextTick();
      expect(within(rowAnswers(1)).queryByRole('alert')).not.toBeInTheDocument();

      await user.click(button(tr.$tr('addDistractorBtn')));
      await nextTick();
      expect(
        within(rowAnswers(1)).getByText(tr.$tr('errorDuplicateDistractorContent')),
      ).toBeInTheDocument();
      expect(
        within(distractorList()).getByText(tr.$tr('errorDuplicateDistractorContent')),
      ).toBeInTheDocument();
    });

    it('accepts the same answer in two rows', async () => {
      const user = userEvent.setup();
      renderEditor();
      await writeAnswer(user, 2, 'Mammal');
      expect(within(rowAnswers(2)).getByText('Mammal')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('view mode', () => {
    const renderView = (props = {}) => renderEditor({ mode: 'view', ...props });
    const pool = () => screen.getByRole('list', { name: tr.$tr('responsePoolLabel') });

    it('repeats an answer in the pool once per row it serves, and each distractor once', () => {
      renderView({
        interaction: blockWithDecl(SHARED_ANSWER_XML, SHARED_ANSWER_DECL_XML),
      });
      expect(within(pool()).getAllByText('Mammal')).toHaveLength(2);
      expect(within(pool()).getAllByText('Reptile')).toHaveLength(1);
    });

    it('lists every row prompt and no answer when answers are hidden', () => {
      renderView();
      for (const content of ['Dog', 'Eagle', 'Frog']) {
        expect(within(rowsList()).getByText(content)).toBeInTheDocument();
      }
      expect(screen.getAllByText('Mammal')).toHaveLength(1);
      expect(within(pool()).getByText('Mammal')).toBeInTheDocument();
    });

    it('lists each row’s answers beside its prompt when answers are shown', () => {
      renderView({ showAnswers: true });
      expect(within(rowAnswers(1)).getByText('Mammal')).toBeInTheDocument();
      expect(within(rowAnswers(2)).getByText('Bird')).toBeInTheDocument();
      expect(within(rowsList()).queryByText('Reptile')).not.toBeInTheDocument();
    });

    it('paints the pool chip of an answer green, and not a distractor’s, when answers are shown', () => {
      const palette = themePalette();
      renderView({ showAnswers: true });
      const chip = text => within(pool()).getByText(text).closest('li');
      expect(chip('Mammal')).toHaveStyle({ borderColor: palette.green.v_600 });
      expect(chip('Reptile')).not.toHaveStyle({ borderColor: palette.green.v_600 });
    });

    it('leaves the answers listed beside their prompts unpainted', () => {
      renderView({ showAnswers: true });
      const chip = within(rowAnswers(1)).getByText('Mammal').closest('li');
      expect(chip).toHaveStyle({ borderColor: themeTokens().fineLine });
    });

    it('heads the answers column only when answers are shown', async () => {
      const { updateProps } = renderView();
      expect(screen.getByText(tr.$tr('promptColumnLabel'))).toBeInTheDocument();
      expect(screen.queryByText(tr.$tr('answersColumnLabel'))).not.toBeInTheDocument();
      await updateProps({ showAnswers: true });
      expect(screen.getByText(tr.$tr('answersColumnLabel'))).toBeInTheDocument();
    });

    it('hides the editing controls', () => {
      renderView();
      expect(queryButton(tr.$tr('addRowBtn'))).not.toBeInTheDocument();
      expect(queryButton(tr.$tr('addDistractorBtn'))).not.toBeInTheDocument();
      expect(queryButton(deleteRow(1))).not.toBeInTheDocument();
      expect(queryButton(editRow(1))).not.toBeInTheDocument();
    });

    it('opens no editor when a row prompt is clicked', async () => {
      const user = userEvent.setup();
      renderView({ showAnswers: true });
      await user.click(within(rowsList()).getByText('Dog'));
      expect(openTextarea()).toBeUndefined();
    });
  });

  describe('emits', () => {
    it('does not emit update:interaction on mount in edit mode', () => {
      const { emitted } = renderEditor();
      expect(updates(emitted)).toHaveLength(0);
    });

    it('does not emit update:interaction when moving between editors changes nothing', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(editRow(2)));
      await user.click(button(tr.$tr('editQuestionLabel')));
      expect(updates(emitted)).toHaveLength(0);
    });

    it('does not emit update:interaction in view mode', () => {
      const { emitted } = renderEditor({ mode: 'view', showAnswers: true });
      expect(updates(emitted)).toHaveLength(0);
    });

    it('emits update:interaction after adding a row', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor();
      await user.click(button(tr.$tr('addRowBtn')));
      const payload = updates(emitted).at(-1)[0];
      expect(payload.bodyXml.match(/<qti-simple-associable-choice/g)).toHaveLength(9);
      expect(payload.responseDeclarations).toHaveLength(1);
    });
  });

  describe('accessibility', () => {
    it('opens a row prompt from the keyboard', async () => {
      const user = userEvent.setup();
      renderEditor();
      button(editRow(2)).focus();
      await user.keyboard('{Enter}');
      expect(queryButton(editRow(2))).not.toBeInTheDocument();
    });

    it('adds a row from the keyboard', async () => {
      const user = userEvent.setup();
      renderEditor();
      button(tr.$tr('addRowBtn')).focus();
      await user.keyboard('{Enter}');
      expect(rows()).toHaveLength(4);
    });

    it('moves focus to the previous row when the last row is deleted', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(deleteRow(3)));
      await nextTick();
      expect(button(deleteRow(2))).toHaveFocus();
    });

    it('moves focus to the add row button when no removable row is left', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(deleteRow(1)));
      await user.click(button(deleteRow(1)));
      await nextTick();
      expect(button(tr.$tr('addRowBtn'))).toHaveFocus();
    });

    it('moves focus to the answer that takes a deleted answer’s place', async () => {
      const user = userEvent.setup();
      renderEditor();
      await writeAnswer(user, 1, 'Canine');
      await writeAnswer(user, 1, 'Vertebrate');
      await user.click(button(deleteMatch(1, 1)));
      await nextTick();
      expect(button(deleteMatch(1, 1))).toHaveFocus();
    });

    it("moves focus to the row's add answer control when one answer is left", async () => {
      const user = userEvent.setup();
      renderEditor();
      await writeAnswer(user, 2, 'Aves');
      await user.click(button(deleteMatch(2, 1)));
      await nextTick();
      expect(button(addMatch(2))).toHaveFocus();
    });

    it('moves focus to the distractor that takes a deleted one’s place', async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(button(tr.$tr('addDistractorBtn')));
      await user.type(openTextarea(), 'Fish');
      await user.click(button(editRow(1)));
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

    it("moves focus to the row's add answer control when its draft is discarded", async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(rowAnswers(2));
      await user.click(button(deleteMatch(2, 2)));
      await nextTick();
      expect(button(addMatch(2))).toHaveFocus();
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
    it('renders one blank row when bodyXml is empty', () => {
      renderEditor({ interaction: block('') });
      expect(rows()).toHaveLength(1);
      expect(button(tr.$tr('addRowBtn'))).toBeInTheDocument();
    });

    it('renders one row when the XML is malformed', () => {
      renderEditor({ interaction: block('<unclosed') });
      expect(rows()).toHaveLength(1);
    });
  });
});
