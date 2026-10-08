import Vue, { nextTick } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import QTIEditor from '../index.vue';
import { qtiEditorStrings } from '../qtiEditorStrings';
import { AssessmentItemTypes } from '../constants';
import { VALID_CHOICE_ITEM_DOCUMENT } from '../utils/testingFixtures';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false), windowIsLarge: ref(true) }),
  };
});

const { toolbarLabelEdit$, closeBtnLabel$, unsupportedItemMessage$ } = qtiEditorStrings;

const QTI_ITEM = {
  assessment_id: 'qti-item',
  type: AssessmentItemTypes.QTI,
  raw_data: VALID_CHOICE_ITEM_DOCUMENT,
};

const renderComponent = assessments =>
  render(QTIEditor, {
    props: { assessments },
    routes: new VueRouter(),
  });

const editButton = () => screen.getByRole('button', { name: toolbarLabelEdit$() });

// jsdom implements no layout, so it has no scrollIntoView for an opening card to call.
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});
afterAll(() => {
  delete Element.prototype.scrollIntoView;
});

describe('QTIEditor', () => {
  describe('opening a question', () => {
    test('opens a question from its Edit action', async () => {
      renderComponent([QTI_ITEM]);
      await fireEvent.click(editButton());
      expect(screen.getByRole('button', { name: closeBtnLabel$() })).toBeInTheDocument();
    });

    test('opens a question when its card is clicked', async () => {
      renderComponent([QTI_ITEM]);
      await fireEvent.click(screen.getByTestId('item'));
      expect(screen.getByRole('button', { name: closeBtnLabel$() })).toBeInTheDocument();
    });

    test('keeps a question closed after its Close button is clicked', async () => {
      renderComponent([QTI_ITEM]);
      await fireEvent.click(editButton());
      // A real click lets Vue re-render between listeners as it bubbles, so the card already
      // sees itself closed when the click reaches it. Flushing synchronously reproduces that.
      Vue.config.async = false;
      try {
        await fireEvent.click(screen.getByRole('button', { name: closeBtnLabel$() }));
      } finally {
        Vue.config.async = true;
      }
      expect(screen.queryByRole('button', { name: closeBtnLabel$() })).not.toBeInTheDocument();
    });

    test('moves focus to the Edit action when a question is closed', async () => {
      // The Close button goes with the card, taking focus with it.
      renderComponent([QTI_ITEM]);
      await fireEvent.click(editButton());
      await fireEvent.click(screen.getByRole('button', { name: closeBtnLabel$() }));
      await nextTick();
      expect(editButton()).toHaveFocus();
    });

    test('offers no Edit action on a question that is already open', async () => {
      renderComponent([QTI_ITEM]);
      await fireEvent.click(editButton());
      expect(editButton()).toBeDisabled();
    });

    test('offers no Edit action on an item authored elsewhere', () => {
      renderComponent([
        { assessment_id: 'perseus-item', type: 'perseus_question', raw_data: '{}' },
      ]);
      expect(editButton()).toBeDisabled();
    });

    test('offers no Edit action on a question whose XML cannot be read', () => {
      renderComponent([
        {
          assessment_id: 'broken-item',
          type: AssessmentItemTypes.QTI,
          raw_data: '<qti-assessment-item><oops>',
        },
      ]);
      expect(screen.getByText(unsupportedItemMessage$())).toBeInTheDocument();
      expect(editButton()).toBeDisabled();
    });
  });
});
