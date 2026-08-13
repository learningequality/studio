import { render, screen, fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import OrderingInteractionEditor from '../OrderingInteractionEditor.vue';

import {
  ORDERING_XML,
  ORDERING_DECL_XML,
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

const renderEditor = (props = {}) =>
  render(OrderingInteractionEditor, {
    props: { mode: 'edit', ...props },
    routes: new VueRouter(),
  });

describe('OrderingInteractionEditor', () => {
  describe('edit mode rendering', () => {
    it('renders the prompt text from the XML', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      // TipTapEditor mock renders `value` as-is in a <p>; use partial text match.
      expect(screen.getByText(/Arrange the planets/)).toBeInTheDocument();
    });

    it('renders a numbered position badge for each item', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      // Items fixture has 3 items — badges "1", "2", "3"
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders item content text for each item', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      expect(screen.getByText('Mercury')).toBeInTheDocument();
      expect(screen.getByText('Venus')).toBeInTheDocument();
      expect(screen.getByText('Earth')).toBeInTheDocument();
    });

    it('renders the correct order header', () => {
      renderEditor({
        interaction: block(ORDERING_XML),
        questionType: QuestionType.ORDERING,
      });
      expect(screen.getByText(tr.$tr('correctOrderLabel'))).toBeInTheDocument();
    });

    it('renders the "Learners will see these shuffled" description', () => {
      renderEditor({
        interaction: block(ORDERING_XML),
        questionType: QuestionType.ORDERING,
      });
      expect(screen.getByText(tr.$tr('correctOrderDescription'))).toBeInTheDocument();
    });

    it('renders the Add option button', () => {
      renderEditor({
        interaction: block(ORDERING_XML),
        questionType: QuestionType.ORDERING,
      });
      expect(screen.getByRole('button', { name: tr.$tr('addItemBtn') })).toBeInTheDocument();
    });

    it('adds a new item row when Add option is clicked', async () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      await fireEvent.click(screen.getByRole('button', { name: tr.$tr('addItemBtn') }));
      // 3 original + 1 new = position badge "4"
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('disables move-up button for the first item', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      expect(
        screen.getByRole('button', { name: tr.$tr('moveItemUpBtn', { number: 1 }) }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: tr.$tr('moveItemUpBtn', { number: 2 }) }),
      ).toBeEnabled();
    });

    it('disables move-down button for the last item', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      expect(
        screen.getByRole('button', { name: tr.$tr('moveItemDownBtn', { number: 3 }) }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: tr.$tr('moveItemDownBtn', { number: 1 }) }),
      ).toBeEnabled();
    });

    it('disables delete button when only one item remains', async () => {
      const singleItemXml = `<qti-order-interaction response-identifier="RESPONSE" orientation="vertical" shuffle="true">
        <qti-simple-choice identifier="order_aaa11111">Mercury</qti-simple-choice>
      </qti-order-interaction>`;
      renderEditor({
        interaction: block(singleItemXml),
        questionType: QuestionType.ORDERING,
      });
      expect(
        screen.getByRole('button', { name: tr.$tr('deleteItemBtn', { number: 1 }) }),
      ).toBeDisabled();
    });
  });

  describe('view mode', () => {
    it('hides items when mode=view and showAnswers=false', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
        mode: 'view',
        showAnswers: false,
      });
      expect(screen.queryByText('Mercury')).not.toBeInTheDocument();
    });

    it('shows items in correct order when mode=view and showAnswers=true', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
        mode: 'view',
        showAnswers: true,
      });
      expect(screen.getByText('Mercury')).toBeInTheDocument();
      expect(screen.getByText('Venus')).toBeInTheDocument();
      expect(screen.getByText('Earth')).toBeInTheDocument();
    });

    it('hides the Add option button in view mode', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
        mode: 'view',
        showAnswers: true,
      });
      expect(screen.queryByRole('button', { name: tr.$tr('addItemBtn') })).not.toBeInTheDocument();
    });

    it('hides move/delete buttons in view mode', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
        mode: 'view',
        showAnswers: true,
      });
      expect(
        screen.queryByRole('button', { name: tr.$tr('deleteItemBtn', { number: 1 }) }),
      ).not.toBeInTheDocument();
    });
  });

  describe('emits', () => {
    it('emits update:interaction on initial mount in edit mode', () => {
      const { emitted } = renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      expect(emitted()['update:interaction']).toBeTruthy();
      const payload = emitted()['update:interaction'][0][0];
      expect(typeof payload.bodyXml).toBe('string');
      expect(Array.isArray(payload.responseDeclarations)).toBe(true);
    });

    it('emits update:interaction after adding an item', async () => {
      const { emitted } = renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      const before = emitted()['update:interaction'].length;
      await fireEvent.click(screen.getByRole('button', { name: tr.$tr('addItemBtn') }));
      expect(emitted()['update:interaction'].length).toBeGreaterThan(before);
    });

    it('does not emit update:interaction in view mode', async () => {
      const { emitted } = renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
        mode: 'view',
        showAnswers: true,
      });
      // Clear mount-time emissions — none should fire in view mode
      expect(emitted()['update:interaction']).toBeFalsy();
    });
  });

  describe('validation', () => {
    it('does not show errors before any field is touched', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows errors after runValidation is triggered by state mutation', async () => {
      jest.useFakeTimers();
      renderEditor({
        interaction: block(''),
        questionType: QuestionType.ORDERING,
      });
      await fireEvent.click(screen.getByRole('button', { name: tr.$tr('addItemBtn') }));
      await nextTick();
      jest.advanceTimersByTime(400);
      await nextTick();
      jest.useRealTimers();
      // Prompt is empty → should show prompt required error
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
  });

  describe('graceful fallback', () => {
    it('renders default state when bodyXml is empty', () => {
      renderEditor({ interaction: block(''), questionType: QuestionType.ORDERING });
      // Default state now seeds 1 item
      expect(screen.getByText('1')).toBeInTheDocument();
      // Should show the 'Add option' button
      expect(screen.getByRole('button', { name: tr.$tr('addItemBtn') })).toBeInTheDocument();
    });
  });
});
