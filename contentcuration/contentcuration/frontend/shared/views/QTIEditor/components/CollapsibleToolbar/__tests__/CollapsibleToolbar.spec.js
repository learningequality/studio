import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import CollapsibleToolbar from '../index.vue';
import { commonStrings } from 'shared/strings/commonStrings';

const { optionsLabel$ } = commonStrings;

const makeAction = (overrides = {}) => ({
  id: 'action-1',
  icon: 'edit',
  label: 'Edit',
  handler: jest.fn(),
  collapsed: false,
  disabled: false,
  ...overrides,
});

const renderComponent = (actions = [], optionsLabel = null) => {
  return render(CollapsibleToolbar, {
    props: { actions, optionsLabel },
    routes: new VueRouter(),
  });
};

describe('CollapsibleToolbar', () => {
  describe('visible icon actions', () => {
    test('renders icon buttons for non-collapsed actions with icons', () => {
      const actions = [
        makeAction({ id: 'a1', label: 'Edit', icon: 'edit', collapsed: false }),
        makeAction({ id: 'a2', label: 'Move up', icon: 'chevronUp', collapsed: false }),
      ];
      renderComponent(actions);
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Move up' })).toBeInTheDocument();
    });

    test('does not render an icon button for collapsed actions', () => {
      const actions = [
        makeAction({ id: 'a1', label: 'Edit', icon: 'edit', collapsed: false }),
        makeAction({ id: 'a2', label: 'Delete', icon: 'delete', collapsed: true }),
      ];
      renderComponent(actions);
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      // 'Delete' only appears inside the dropdown, not as a standalone icon button
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    test('calls the action handler when an icon button is clicked', async () => {
      const user = userEvent.setup();
      const handler = jest.fn();
      const actions = [
        makeAction({ id: 'a1', label: 'Edit', icon: 'edit', collapsed: false, handler }),
      ];
      renderComponent(actions);
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('collapsed dropdown menu', () => {
    test('does not render the options button when there are no collapsed actions', () => {
      const actions = [makeAction({ id: 'a1', icon: 'edit', collapsed: false })];
      renderComponent(actions);
      expect(screen.queryByRole('button', { name: optionsLabel$() })).not.toBeInTheDocument();
    });

    test('renders the options button when there are collapsed actions', () => {
      const actions = [
        makeAction({ id: 'a1', icon: 'edit', collapsed: false }),
        makeAction({ id: 'a2', icon: null, label: 'Delete', collapsed: true, handler: jest.fn() }),
      ];
      renderComponent(actions);
      expect(screen.getByRole('button', { name: optionsLabel$() })).toBeInTheDocument();
    });

    test('renders the options button when an action has no icon (forces it to menu)', () => {
      const actions = [makeAction({ id: 'a1', icon: null, label: 'Delete', collapsed: false })];
      renderComponent(actions);
      expect(screen.getByRole('button', { name: optionsLabel$() })).toBeInTheDocument();
    });

    test('uses the provided optionsLabel prop for the menu button', () => {
      const actions = [makeAction({ id: 'a1', icon: null, label: 'Delete', collapsed: true })];
      renderComponent(actions, 'Custom options label');
      expect(screen.getByRole('button', { name: 'Custom options label' })).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    test('renders the icon button as disabled when action.disabled is true', () => {
      const actions = [
        makeAction({ id: 'a1', label: 'Edit', icon: 'edit', collapsed: false, disabled: true }),
      ];
      renderComponent(actions);
      expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    });
  });
});
