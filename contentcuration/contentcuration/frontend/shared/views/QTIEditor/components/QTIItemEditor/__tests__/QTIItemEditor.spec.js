import { render, screen, fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import QTIItemEditor from '../index.vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { AssessmentItemTypes } from '../../../constants';
import {
  VALID_CHOICE_ITEM_DOCUMENT,
  CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER,
  ORDERING_ITEM_DOCUMENT_NO_PROMPT,
  FREE_RESPONSE_ITEM_DOCUMENT,
  NO_INTERACTION_ITEM_DOCUMENT,
  CHOICE_ITEM_DOCUMENT_WITH_HINTS,
  NO_INTERACTION_ITEM_WITH_HINTS,
} from '../../../utils/testingFixtures';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});

const {
  closeBtnLabel$,
  questionContentPlaceholder$,
  unsupportedItemMessage$,
  incompleteItemIndicatorLabel$,
  hintsLabel$,
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

const renderComponent = (props = {}, slots = {}) => {
  return render(QTIItemEditor, {
    props: { ...defaultProps, ...props },
    slots,
    routes: new VueRouter(),
  });
};

describe('QTIItemEditor', () => {
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
      });
      expect(screen.getByText(unsupportedItemMessage$())).toBeInTheDocument();
    });

    test('shows a read-only message when the item XML cannot be read', () => {
      renderComponent({
        item: {
          assessment_id: 'broken-item',
          type: AssessmentItemTypes.QTI,
          raw_data: '<qti-assessment-item><oops>',
        },
      });
      expect(screen.getByText(unsupportedItemMessage$())).toBeInTheDocument();
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

    test('is shown for an item with no interaction at all', async () => {
      await renderAndValidate(NO_INTERACTION_ITEM_DOCUMENT);
      expect(screen.getByText(incompleteItemIndicatorLabel$())).toBeInTheDocument();
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

    test('keeps the body of a question that has no interaction when a hint changes', async () => {
      // Nothing mounts an interaction editor here, so the editor holds no body of its own.
      // Assembling from that empty state would replace the question's text with an empty
      // <qti-item-body/> — a hint edit silently deleting the question.
      const { emitted } = renderComponent({
        item: { ...defaultProps.item, raw_data: NO_INTERACTION_ITEM_WITH_HINTS },
        mode: 'edit',
      });
      await fireEvent.click(screen.getByRole('button', { name: hintsLabel$() }));
      await fireEvent.click(screen.getAllByRole('button', { name: 'Delete hint' })[0]);
      await nextTick();

      const [xml] = emitted()['update:rawData'].at(-1);
      expect(xml).toContain('What is the capital of France?');
      expect(xml).not.toContain('<qti-item-body/>');
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

  describe('toolbarActions slot', () => {
    test('renders content injected into the toolbarActions slot', () => {
      renderComponent({}, { toolbarActions: '<button>Edit</button>' });
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });
  });
});
