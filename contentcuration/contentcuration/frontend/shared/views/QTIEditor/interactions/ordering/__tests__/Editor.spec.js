import { render, screen, fireEvent, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import OrderingEditor from '../Editor.vue';

import {
  ORDERING_XML,
  ORDERING_DECL_XML,
  mockInteractionBlock as block,
  mockInteractionBlockWithDecl as blockWithDecl,
} from '../../../utils/testingFixtures';
import { QuestionType } from '../../../constants';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';
import { dragSortStrings as dragTr } from 'shared/views/dragSort/dragSortStrings';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
// jsdom cannot produce the pointer events real SortableJS listens for, so the tests
// call the captured `onEnd` instead.
let mockSortableInstances;
jest.mock('sortablejs', () =>
  jest.fn().mockImplementation((el, options) => {
    const instance = { el, options, option: jest.fn(), destroy: jest.fn() };
    mockSortableInstances.push(instance);
    return instance;
  }),
);

// `useDraggableUniverse` destructures this composable too, so the automock has to return
// a usable object rather than undefined.
jest.mock('kolibri-design-system/lib/composables/useKLiveRegion');

let sendPoliteMessage;

beforeEach(() => {
  mockSortableInstances = [];
  sendPoliteMessage = jest.fn();
  useKLiveRegion.mockReturnValue({ sendPoliteMessage });
});

const itemLabel = number => tr.$tr('orderingItemLabel', { number });
const moveUpName = number => dragTr.$tr('moveItemUpLabel', { item: itemLabel(number) });
const moveDownName = number => dragTr.$tr('moveItemDownLabel', { item: itemLabel(number) });

const renderEditor = (props = {}) =>
  render(OrderingEditor, {
    props: { mode: 'edit', ...props },
    routes: new VueRouter(),
  });

const dragFirstRowToLast = async () => {
  const { options, el } = mockSortableInstances[mockSortableInstances.length - 1];
  options.onEnd({
    item: el.children[0],
    from: el,
    to: el,
    oldIndex: 0,
    oldDraggableIndex: 0,
    newDraggableIndex: el.children.length - 1,
  });
  await nextTick();
};

describe('OrderingEditor', () => {
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

    it('hides move-up on the first item and move-down on the last', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      // `v-show` hides the out-of-range control, dropping it out of the accessibility tree
      expect(screen.queryByRole('button', { name: moveUpName(1) })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: moveUpName(2) })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: moveUpName(3) })).toBeInTheDocument();

      expect(screen.getByRole('button', { name: moveDownName(1) })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: moveDownName(2) })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: moveDownName(3) })).not.toBeInTheDocument();
    });

    it('renders the items as a list', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      const list = screen.getByRole('list');
      // Asserted as an attribute, not a role: jsdom gives a bare <ol> the implicit list role,
      // so the explicit one Safari needs would be deletable with this test still green.
      expect(list).toHaveAttribute('role', 'list');
      expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    });

    it('reorders the items when a row is dragged to a new position', async () => {
      const { emitted } = renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      await dragFirstRowToLast();

      const { bodyXml } = emitted()['update:interaction'].pop()[0];
      expect(bodyXml.indexOf('identifier="order_aaa11111"')).toBeGreaterThan(
        bodyXml.indexOf('identifier="order_ccc33333"'),
      );
    });

    it('reorders the items when a row is moved down by keyboard', async () => {
      const user = userEvent.setup();
      const { emitted } = renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      await user.click(screen.getByRole('button', { name: moveDownName(1) }));
      const { bodyXml } = emitted()['update:interaction'].pop()[0];
      expect(bodyXml.indexOf('identifier="order_bbb22222"')).toBeLessThan(
        bodyXml.indexOf('identifier="order_aaa11111"'),
      );
    });

    it('announces the moved item and its new position', async () => {
      const user = userEvent.setup();
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      await user.click(screen.getByRole('button', { name: moveUpName(2) }));

      expect(sendPoliteMessage).toHaveBeenCalledWith(
        dragTr.$tr('itemMovedToPosition', { item: itemLabel(2), position: 1, total: 3 }),
      );
    });

    it('keeps focus on the move-up button of the item that moved', async () => {
      const user = userEvent.setup();
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      await user.click(screen.getByRole('button', { name: moveUpName(3) }));

      // The moved item is now second, so its widget is the one labelled for position 2.
      expect(screen.getByRole('button', { name: moveUpName(2) })).toHaveFocus();
    });

    it('moves focus to the move-down button when an item lands first', async () => {
      const user = userEvent.setup();
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      await user.click(screen.getByRole('button', { name: moveUpName(2) }));

      // First position hides move-up, so focus has to fall back to move-down.
      expect(screen.getByRole('button', { name: moveDownName(1) })).toHaveFocus();
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
      expect(screen.queryByRole('button', { name: moveDownName(1) })).not.toBeInTheDocument();
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
    it('shows no errors for a question that is already complete', () => {
      renderEditor({
        interaction: blockWithDecl(ORDERING_XML, ORDERING_DECL_XML),
        questionType: QuestionType.ORDERING,
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('reports what is missing as soon as the state changes', async () => {
      renderEditor({
        interaction: block(''),
        questionType: QuestionType.ORDERING,
      });
      await fireEvent.click(screen.getByRole('button', { name: tr.$tr('addItemBtn') }));
      await nextTick();

      expect(screen.getByText(tr.errorPromptRequired$())).toBeInTheDocument();
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
