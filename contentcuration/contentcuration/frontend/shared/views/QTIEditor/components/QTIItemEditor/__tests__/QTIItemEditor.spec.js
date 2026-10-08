import { render, screen, fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import QTIItemEditor from '../index.vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { AssessmentItemTypes } from '../../../constants';
import {
  VALID_CHOICE_ITEM_DOCUMENT,
  CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER,
  CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER_WITH_STIMULUS,
  ORDERING_ITEM_DOCUMENT_NO_PROMPT,
  CHOICE_ITEM_DOCUMENT_WITH_HINTS_AND_STIMULUS,
  CHOICE_ITEM_DOCUMENT_WITH_STIMULUS,
  FREE_RESPONSE_ITEM_DOCUMENT,
  NO_INTERACTION_ITEM_DOCUMENT,
  CHOICE_ITEM_DOCUMENT_WITH_HINTS,
  VALID_ASSOCIATE_ITEM_DOCUMENT,
  VALID_MATCH_ITEM_DOCUMENT,
  MATCH_THREE_SETS_XML,
  MATCH_XML,
  MULTI_TEXT_ENTRY_ITEM_DOCUMENT,
  TEXT_ENTRY_ITEM_DOCUMENT_SHARED_PARAGRAPH,
  TEXT_ENTRY_ITEM_DOCUMENT_TRAILING_CONTENT,
  MULTI_INTERACTION_ITEM_DOCUMENT,
  UNRECOGNIZED_INTERACTION_ITEM_DOCUMENT,
  INLINE_CHOICE_ITEM_DOCUMENT,
} from '../../../utils/testingFixtures';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false), windowIsLarge: ref(true) }),
  };
});

const {
  closeBtnLabel$,
  questionContentPlaceholder$,
  unsupportedItemMessage$,
  deleteUnsupportedItemMessage$,
  incompleteItemIndicatorLabel$,
  hintsLabel$,
  associateLabel$,
  matchLabel$,
  questionNumberAndTypeLabel$,
  unknownTypeLabel$,
  responsePoolLabel$,
} = qtiEditorStrings;

const defaultProps = {
  item: {
    assessment_id: 'test-item-id',
    type: AssessmentItemTypes.QTI,
  },
  index: 0,
  total: 5,
  mode: 'view',
  showAnswers: false,
};

const renderComponent = (props = {}, slots = {}, listeners = { open: () => {} }) => {
  return render(QTIItemEditor, {
    props: { ...defaultProps, ...props },
    slots,
    listeners,
    routes: new VueRouter(),
  });
};

const renderDocument = (raw_data, props = {}) =>
  renderComponent({
    item: { assessment_id: 'item-id', type: AssessmentItemTypes.QTI, raw_data },
    ...props,
  });

// jsdom implements no layout, so it has no scrollIntoView for an opening card to call.
const scrollIntoView = jest.fn();
beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterAll(() => {
  delete Element.prototype.scrollIntoView;
});

// jest_config/setup.js adds a hidden csrf input to the document.
const isAuthorInput = el => el.name !== 'csrfmiddlewaretoken';

describe('QTIItemEditor', () => {
  beforeEach(() => scrollIntoView.mockClear());
  afterEach(() => jest.restoreAllMocks());

  describe('view mode', () => {
    test('shows the card body (placeholder) even in view mode', () => {
      renderComponent({ mode: 'view' });
      expect(screen.getByText(questionContentPlaceholder$())).toBeInTheDocument();
    });

    test('does not show the close button', () => {
      renderComponent({ mode: 'view' });
      expect(screen.queryByRole('button', { name: closeBtnLabel$() })).not.toBeInTheDocument();
    });
  });

  describe('opening the card by clicking it', () => {
    test('asks to open a closed card when it is clicked', async () => {
      const { emitted } = renderComponent({ mode: 'view' });
      await fireEvent.click(screen.getByText(questionContentPlaceholder$()));
      expect(emitted().open).toHaveLength(1);
    });

    test('does not ask to open a card that is already open', async () => {
      const { emitted } = renderComponent({ mode: 'edit' });
      await fireEvent.click(screen.getByText(questionContentPlaceholder$()));
      expect(emitted().open).toBeUndefined();
    });

    test('does not ask to open an item this editor cannot edit', async () => {
      const { emitted } = renderComponent({
        item: { assessment_id: 'perseus-item', type: 'perseus_question', raw_data: '{}' },
      });
      await fireEvent.click(screen.getByText(unsupportedItemMessage$()));
      expect(emitted().open).toBeUndefined();
    });

    test('leaves clicks on the toolbar actions to the actions themselves', async () => {
      const { emitted } = renderComponent(
        { mode: 'view' },
        { toolbarActions: '<button type="button">Move up</button>' },
      );
      await fireEvent.click(screen.getByRole('button', { name: 'Move up' }));
      expect(emitted().open).toBeUndefined();
    });

    test('asks to open a closed card when its incomplete indicator is clicked', async () => {
      const { emitted } = renderComponent({
        item: { ...defaultProps.item, raw_data: CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER },
        mode: 'view',
      });
      await fireEvent.click(await screen.findByTestId('incompleteIndicator'));
      expect(emitted().open).toHaveLength(1);
    });

    test('leaves clicks on buttons inside the card body to the buttons themselves', async () => {
      const { emitted } = renderComponent({
        item: { ...defaultProps.item, raw_data: CHOICE_ITEM_DOCUMENT_WITH_HINTS },
        mode: 'view',
        showAnswers: true,
      });
      await fireEvent.click(screen.getByRole('button', { name: hintsLabel$() }));
      expect(emitted().open).toBeUndefined();
    });

    test('offers no way to open a card whose consumer does not listen for it', async () => {
      const { container, emitted } = renderComponent({ mode: 'view' }, {}, {});
      expect(container.firstChild).not.toHaveClass('is-clickable');
      await fireEvent.click(screen.getByText(questionContentPlaceholder$()));
      expect(emitted().open).toBeUndefined();
    });

    test('keeps the click that opens a card from carrying on to the document', async () => {
      // The editor's click-outside handler lives there, and minimizes the question.
      const onDocumentClick = jest.fn();
      document.addEventListener('click', onDocumentClick);
      try {
        const { emitted } = renderComponent({ mode: 'view' });
        await fireEvent.click(screen.getByText(questionContentPlaceholder$()));
        expect(emitted().open).toHaveLength(1);
        expect(onDocumentClick).not.toHaveBeenCalled();
      } finally {
        document.removeEventListener('click', onDocumentClick);
      }
    });
  });

  describe('bringing an opened card into view', () => {
    test('scrolls the start of the card into view when it opens', async () => {
      const { container, updateProps } = renderComponent({ mode: 'view' });
      await updateProps({ mode: 'edit' });
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
      expect(scrollIntoView.mock.instances[0]).toBe(container.firstChild);
    });

    test('scrolls the start of a card into view when it is created open', () => {
      const { container } = renderComponent({ mode: 'edit' });
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
      expect(scrollIntoView.mock.instances[0]).toBe(container.firstChild);
    });

    test('leaves the scroll position alone for a closed card', () => {
      renderComponent({ mode: 'view' });
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    test('leaves the scroll position alone when a card closes', async () => {
      const { updateProps } = renderComponent({ mode: 'edit' });
      scrollIntoView.mockClear();
      await updateProps({ mode: 'view' });
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    test('shows the card body', () => {
      renderComponent({ mode: 'edit' });
      expect(screen.getByText(questionContentPlaceholder$())).toBeInTheDocument();
    });

    test('shows the close button', () => {
      renderComponent({ mode: 'edit' });
      expect(screen.getByRole('button', { name: closeBtnLabel$() })).toBeInTheDocument();
    });

    test('emits a close event when the close button is clicked', async () => {
      const { emitted } = renderComponent({ mode: 'edit' });
      await fireEvent.click(screen.getByRole('button', { name: closeBtnLabel$() }));
      expect(emitted().close).toHaveLength(1);
    });
  });

  describe('showAnswers', () => {
    test('shows the card body in view mode when showAnswers is true', () => {
      renderComponent({ mode: 'view', showAnswers: true });
      expect(screen.getByText(questionContentPlaceholder$())).toBeInTheDocument();
    });

    test('does not show the close button even when showAnswers is true', () => {
      renderComponent({ mode: 'view', showAnswers: true });
      expect(screen.queryByRole('button', { name: closeBtnLabel$() })).not.toBeInTheDocument();
    });
  });

  describe('items this editor cannot edit', () => {
    test('shows a read-only message for an item authored elsewhere', () => {
      renderComponent({
        item: { assessment_id: 'perseus-item', type: 'perseus_question', raw_data: '{}' },
        canDelete: true,
      });
      expect(screen.getByTestId('unsupportedMessage')).toHaveTextContent(unsupportedItemMessage$());
      expect(screen.queryByText(deleteUnsupportedItemMessage$())).not.toBeInTheDocument();
    });

    describe('items the editor cannot rebuild', () => {
      const publishableDocuments = {
        'two interactions': MULTI_INTERACTION_ITEM_DOCUMENT,
        'an interaction with no descriptor': UNRECOGNIZED_INTERACTION_ITEM_DOCUMENT,
        'an interaction with no editor': INLINE_CHOICE_ITEM_DOCUMENT,
        'several blanks in one text entry': MULTI_TEXT_ENTRY_ITEM_DOCUMENT,
        'a stimulus beside a block interaction': CHOICE_ITEM_DOCUMENT_WITH_STIMULUS,
        'a stimulus beside a hinted block interaction':
          CHOICE_ITEM_DOCUMENT_WITH_HINTS_AND_STIMULUS,
        'text sharing the text entry paragraph': TEXT_ENTRY_ITEM_DOCUMENT_SHARED_PARAGRAPH,
        'content after the text entry paragraph': TEXT_ENTRY_ITEM_DOCUMENT_TRAILING_CONTENT,
      };
      const documents = {
        ...publishableDocuments,
        'no interaction': NO_INTERACTION_ITEM_DOCUMENT,
      };

      test.each(Object.entries(publishableDocuments))(
        'with %s shows the unsupported message and no delete prompt',
        (_, raw_data) => {
          renderDocument(raw_data, { mode: 'view', canDelete: true });
          expect(screen.getByTestId('unsupportedMessage')).toHaveTextContent(
            unsupportedItemMessage$(),
          );
          expect(screen.queryByText(deleteUnsupportedItemMessage$())).not.toBeInTheDocument();
        },
      );

      describe.each(Object.entries(documents))('with %s', (_, raw_data) => {
        test('offers no editable controls or hints in edit mode', () => {
          renderDocument(raw_data, { mode: 'edit' });
          expect(screen.queryByText(hintsLabel$())).not.toBeInTheDocument();
          const buttons = screen.getAllByRole('button');
          expect(buttons).toHaveLength(1);
          expect(buttons[0]).toHaveAccessibleName(closeBtnLabel$());
          expect(screen.queryByRole('radio')).not.toBeInTheDocument();
          expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
          expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
          expect(screen.queryAllByRole('textbox').filter(isAuthorInput)).toHaveLength(0);
        });

        test('leaves raw_data untouched after the card is opened and closed', async () => {
          const { emitted, updateProps } = renderDocument(raw_data, { mode: 'edit' });

          await fireEvent.click(screen.getByRole('button', { name: closeBtnLabel$() }));
          await updateProps({ mode: 'view' });
          await nextTick();

          expect(emitted()['update:rawData']).toBeUndefined();
        });
      });

      test('shows the hints of an unsupported item when answers are shown', () => {
        renderDocument(MULTI_INTERACTION_ITEM_DOCUMENT, { mode: 'view', showAnswers: true });
        expect(screen.getByRole('button', { name: hintsLabel$() })).toBeInTheDocument();
      });
    });
  });

  describe('delete prompt', () => {
    test.each([
      ['XML that cannot be parsed', '<not-xml'],
      ['no interaction', NO_INTERACTION_ITEM_DOCUMENT],
      [
        'a match interaction that cannot be read',
        VALID_MATCH_ITEM_DOCUMENT.replace(MATCH_XML, MATCH_THREE_SETS_XML),
      ],
    ])(
      'asks the author to delete a question with %s instead of only saying it cannot be edited',
      (_, raw_data) => {
        renderDocument(raw_data, { canDelete: true });
        const message = screen.getByTestId('unsupportedMessage');
        expect(message).toHaveTextContent(deleteUnsupportedItemMessage$());
        expect(message).not.toHaveTextContent(unsupportedItemMessage$());
      },
    );

    test('only says the question cannot be edited where the card offers no Delete', () => {
      // Rendered without canDelete, as ResourcePanel's preview does.
      renderDocument('<not-xml');
      expect(screen.getByTestId('unsupportedMessage')).toHaveTextContent(unsupportedItemMessage$());
      expect(screen.queryByText(deleteUnsupportedItemMessage$())).not.toBeInTheDocument();
    });
  });

  describe('incomplete indicator', () => {
    const renderAndValidate = async raw_data => {
      renderComponent({
        item: { assessment_id: 'item-id', type: AssessmentItemTypes.QTI, raw_data },
      });
      await nextTick();
    };

    test('is shown for a question missing something the author has to supply', async () => {
      await renderAndValidate(CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER);
      expect(screen.getByText(incompleteItemIndicatorLabel$())).toBeInTheDocument();
    });

    test('is not shown for a complete question', async () => {
      await renderAndValidate(VALID_CHOICE_ITEM_DOCUMENT);
      expect(screen.queryByText(incompleteItemIndicatorLabel$())).not.toBeInTheDocument();
    });

    // The card reads the item's XML rather than errors an interaction editor reports, so an
    // interaction that reports nothing is covered like any other.
    test('is shown for an incomplete question of any interaction type', async () => {
      await renderAndValidate(ORDERING_ITEM_DOCUMENT_NO_PROMPT);
      expect(screen.getByText(incompleteItemIndicatorLabel$())).toBeInTheDocument();
    });

    test('is shown for an unsupported item with no interaction, which blocks publishing', async () => {
      await renderAndValidate(NO_INTERACTION_ITEM_DOCUMENT);
      expect(screen.getByText(incompleteItemIndicatorLabel$())).toBeInTheDocument();
    });

    test('is shown for an item whose XML cannot be parsed', async () => {
      await renderAndValidate('<not-xml');
      expect(screen.getByText(incompleteItemIndicatorLabel$())).toBeInTheDocument();
    });

    test('is shown for a match interaction that cannot be read', async () => {
      await renderAndValidate(VALID_MATCH_ITEM_DOCUMENT.replace(MATCH_XML, MATCH_THREE_SETS_XML));
      expect(screen.getByText(incompleteItemIndicatorLabel$())).toBeInTheDocument();
    });

    test('is not shown for an item whose body the editor cannot reproduce', async () => {
      await renderAndValidate(CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER_WITH_STIMULUS);
      expect(screen.queryByTestId('incompleteIndicator')).not.toBeInTheDocument();
    });

    test('is not shown for a valid item with unsupported interactions', async () => {
      await renderAndValidate(MULTI_INTERACTION_ITEM_DOCUMENT);
      expect(screen.queryByText(incompleteItemIndicatorLabel$())).not.toBeInTheDocument();
    });

    test('is shown for a free-response question where those are not accepted', async () => {
      renderComponent({
        allowFreeResponse: false,
        item: {
          assessment_id: 'item-id',
          type: AssessmentItemTypes.QTI,
          raw_data: FREE_RESPONSE_ITEM_DOCUMENT,
        },
      });
      await nextTick();

      expect(screen.getByText(incompleteItemIndicatorLabel$())).toBeInTheDocument();
    });

    test('is not shown for a free-response question where those are accepted', async () => {
      await renderAndValidate(FREE_RESPONSE_ITEM_DOCUMENT);
      expect(screen.queryByText(incompleteItemIndicatorLabel$())).not.toBeInTheDocument();
    });
    test('is not shown for a question this editor cannot read', async () => {
      renderComponent({
        item: {
          assessment_id: 'item-id',
          type: AssessmentItemTypes.PERSEUS_QUESTION,
          raw_data: '{"not":"qti"}',
        },
      });
      await nextTick();

      expect(screen.queryByText(incompleteItemIndicatorLabel$())).not.toBeInTheDocument();
    });
  });

  describe('reporting content changes', () => {
    const renderWithContent = mode =>
      renderComponent({
        mode,
        item: {
          assessment_id: 'item-id',
          type: AssessmentItemTypes.QTI,
          raw_data: VALID_CHOICE_ITEM_DOCUMENT,
        },
      });

    test('a card that is only being viewed reports nothing', async () => {
      // A closed card re-assembles its XML too; reporting that would rewrite every
      // question in the list just for being on screen.
      const { emitted } = renderWithContent('view');
      await nextTick();

      expect(emitted()['update:rawData']).toBeUndefined();
    });

    test('a card that is only being viewed does not warn about scoring it will not write', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      renderComponent({
        item: {
          assessment_id: 'item-id',
          type: AssessmentItemTypes.QTI,
          raw_data: MULTI_TEXT_ENTRY_ITEM_DOCUMENT.replace(
            /<qti-correct-response>\s*<qti-value>Moon<\/qti-value>\s*<\/qti-correct-response>/,
            '',
          ),
        },
      });
      await nextTick();

      expect(warn).not.toHaveBeenCalled();
    });

    test('a card reopened for editing reports nothing until the author changes something', async () => {
      const { emitted, updateProps } = renderWithContent('view');
      await updateProps({ mode: 'edit' });
      await nextTick();

      expect(emitted()['update:rawData']).toBeUndefined();
    });

    test('a change made while editing is still reported once the card closes', async () => {
      const { emitted, updateProps } = renderWithContent('edit');
      // Deliberately not awaited: the change and the close land in the same flush, which is
      // what happens when a click closes the card the author was just typing in.
      fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      await updateProps({ mode: 'view' });
      await nextTick();

      expect(emitted()['update:rawData']).toBeDefined();
    });

    test('the card being edited reports the new XML when the author changes it', async () => {
      const { emitted } = renderWithContent('edit');
      // The fixture starts with two choices.
      await fireEvent.click(screen.getByRole('button', { name: /add choice/i }));
      await nextTick();

      const reported = emitted()['update:rawData'].pop()[0];
      expect(reported.match(/<qti-simple-choice/g)).toHaveLength(3);
    });
  });

  describe('hints', () => {
    // Adaptation of the hints previously used in Studio. New hints are not
    // supported, only the display of existing ones.
    test('offers no hints section on a question that arrived without any', () => {
      renderComponent({
        item: { ...defaultProps.item, raw_data: VALID_CHOICE_ITEM_DOCUMENT },
        mode: 'edit',
      });
      expect(screen.queryByText(hintsLabel$())).not.toBeInTheDocument();
    });

    test('offers no hints section on a newly created question', () => {
      renderComponent({ mode: 'edit' });
      expect(screen.queryByText(hintsLabel$())).not.toBeInTheDocument();
    });

    test('shows the hints section on a question that arrived with hints', () => {
      renderComponent({
        item: { ...defaultProps.item, raw_data: CHOICE_ITEM_DOCUMENT_WITH_HINTS },
        mode: 'edit',
      });
      expect(screen.getByText(hintsLabel$())).toBeInTheDocument();
    });

    test('keeps the hints of a closed question out of the way until answers are shown', () => {
      renderComponent({
        item: { ...defaultProps.item, raw_data: CHOICE_ITEM_DOCUMENT_WITH_HINTS },
        mode: 'view',
        showAnswers: false,
      });
      expect(screen.queryByText(hintsLabel$())).not.toBeInTheDocument();
    });

    test('shows the hints of a closed question when answers are shown', () => {
      renderComponent({
        item: { ...defaultProps.item, raw_data: CHOICE_ITEM_DOCUMENT_WITH_HINTS },
        mode: 'view',
        showAnswers: true,
      });
      expect(screen.getByText(hintsLabel$())).toBeInTheDocument();
    });

    test('reports the item XML when a hint changes', async () => {
      const { emitted } = renderComponent({
        item: { ...defaultProps.item, raw_data: CHOICE_ITEM_DOCUMENT_WITH_HINTS },
        mode: 'edit',
      });
      await fireEvent.click(screen.getByRole('button', { name: hintsLabel$() }));
      await fireEvent.click(screen.getAllByRole('button', { name: 'Delete hint' })[0]);
      await nextTick();

      const [xml] = emitted()['update:rawData'].at(-1);
      expect(xml).toContain('<p>test2 2</p>');
      expect(xml).not.toContain('<p>test</p>');
    });
  });

  describe('associate interaction', () => {
    const renderAssociateItem = () =>
      renderComponent({
        item: {
          assessment_id: 'test-item-id',
          type: AssessmentItemTypes.QTI,
          raw_data: VALID_ASSOCIATE_ITEM_DOCUMENT,
        },
      });

    test('names the associate question type rather than falling back to unknown', async () => {
      renderAssociateItem();
      expect(await screen.findByText(associateLabel$(), { exact: false })).toBeInTheDocument();
      expect(screen.queryByText(unknownTypeLabel$(), { exact: false })).not.toBeInTheDocument();
    });

    test('renders the associate editor for the parsed interaction', async () => {
      renderAssociateItem();
      expect(await screen.findByText(responsePoolLabel$())).toBeInTheDocument();
      expect(screen.getByText('Antonio')).toBeInTheDocument();
    });
  });

  describe('match interaction', () => {
    const renderMatchItem = () =>
      renderComponent({
        item: {
          assessment_id: 'test-item-id',
          type: AssessmentItemTypes.QTI,
          raw_data: VALID_MATCH_ITEM_DOCUMENT,
        },
      });

    test('names the match question type rather than falling back to unknown', async () => {
      renderMatchItem();
      const heading = questionNumberAndTypeLabel$({ number: 1, total: 5, type: matchLabel$() });
      expect(await screen.findByText(heading)).toBeInTheDocument();
    });

    test('renders the match editor for the parsed interaction', async () => {
      renderMatchItem();
      expect(await screen.findByText(responsePoolLabel$())).toBeInTheDocument();
      expect(screen.getByText('Dog')).toBeInTheDocument();
    });
  });

  describe('toolbarActions slot', () => {
    test('renders content injected into the toolbarActions slot', () => {
      renderComponent({}, { toolbarActions: '<button>Edit</button>' });
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });
  });
});
