import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import ChannelSharingTable from '../ChannelSharingTable';
import { SharingPermissions } from 'shared/constants';

const localVue = createLocalVue();
localVue.use(Vuex);

const channelId = 'test-channel';

const currentUser = {
  id: 'current-user-id',
  email: 'current@example.com',
  first_name: 'Current',
  last_name: 'User',
};
const otherUser = {
  id: 'other-user-id',
  email: 'other@example.com',
  first_name: 'Other',
  last_name: 'User',
};
const pendingInvitation = {
  id: 'pending-invitation',
  email: 'pending@example.com',
  first_name: 'Pending',
  last_name: 'User',
  pending: true,
  declined: false,
};

const mockActions = {
  sendInvitation: jest.fn(() => Promise.resolve()),
  deleteInvitation: jest.fn(() => Promise.resolve()),
  makeEditor: jest.fn(() => Promise.resolve()),
  removeViewer: jest.fn(() => Promise.resolve()),
  showSnackbar: jest.fn(() => Promise.resolve()),
};

const createMockStore = (users = [currentUser, otherUser], invitations = [pendingInvitation]) => {
  return new Vuex.Store({
    state: {
      session: {
        currentUser,
      },
    },
    modules: {
      channel: {
        namespaced: true,
        actions: {
          sendInvitation: mockActions.sendInvitation,
          deleteInvitation: mockActions.deleteInvitation,
          makeEditor: mockActions.makeEditor,
          removeViewer: mockActions.removeViewer,
        },
        getters: {
          getChannelUsers: () => () => users,
          getChannelInvitations: () => () => invitations,
        },
      },
    },
    actions: {
      showSnackbar: mockActions.showSnackbar,
    },
  });
};

const renderComponent = (props = {}, storeOverrides = {}) => {
  const defaultProps = {
    channelId,
    mode: SharingPermissions.VIEW_ONLY,
    ...props,
  };

  const store = createMockStore(storeOverrides.users, storeOverrides.invitations);

  return render(ChannelSharingTable, {
    localVue,
    store,
    props: defaultProps,
    routes: new VueRouter(),
  });
};

describe('ChannelSharingTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "No users found" message when no users exist', () => {
    renderComponent({}, { users: [], invitations: [] });
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('displays current user correctly', () => {
    renderComponent();
    const cell = screen.getByText('Current User (you)');
    expect(cell).toBeInTheDocument();
    const row = cell.closest('tr');
    expect(row).toHaveTextContent('current@example.com');
    expect(row).not.toHaveTextContent('Invite pending');
  });

  it('displays other user correctly', () => {
    renderComponent();
    const cell = screen.getByText('Other User');
    expect(cell).toBeInTheDocument();
    const row = cell.closest('tr');
    expect(row).toHaveTextContent('other@example.com');
    expect(row).not.toHaveTextContent('Invite pending');
  });

  it('displays pending user correctly', () => {
    renderComponent();
    const cell = screen.getByText('Pending User');
    expect(cell).toBeInTheDocument();
    const row = cell.closest('tr');
    expect(row).toHaveTextContent('pending@example.com');
    expect(row).toHaveTextContent('Invite pending');
  });

  describe('in edit mode', () => {
    it('displays the correct header', () => {
      renderComponent({ mode: SharingPermissions.EDIT });
      expect(screen.getByText(/users who can edit/)).toBeInTheDocument();
    });

    it('does not display the options dropdown for the current user', () => {
      renderComponent({ mode: SharingPermissions.EDIT });
      const row = screen.getByText('Current User (you)').closest('tr');
      const optionsButton = row.querySelector('button');
      expect(optionsButton).not.toBeInTheDocument();
    });

    it('does not display the options dropdown for users who accepted invitations', () => {
      renderComponent({ mode: SharingPermissions.EDIT });
      const row = screen.getByText('Other User').closest('tr');
      const optionsButton = row.querySelector('button');
      expect(optionsButton).not.toBeInTheDocument();
    });

    it('displays the options dropdown with correct options for pending invitations', async () => {
      renderComponent({ mode: SharingPermissions.EDIT });
      const row = screen.getByText('Pending User').closest('tr');
      const optionsButton = row.querySelector('button');
      expect(optionsButton).toBeInTheDocument();

      await userEvent.click(optionsButton);

      expect(screen.getByText('Resend invitation')).toBeInTheDocument();
      expect(screen.getByText('Delete invitation')).toBeInTheDocument();
      expect(screen.queryByText('Grant edit permissions')).not.toBeInTheDocument();
      expect(screen.queryByText('Revoke view permissions')).not.toBeInTheDocument();
    });
  });

  describe('in view-only mode', () => {
    it('displays the correct header', () => {
      renderComponent({ mode: SharingPermissions.VIEW_ONLY });
      expect(screen.getByText(/users who can view/)).toBeInTheDocument();
    });

    it('displays the options dropdown with correct options for pending invitations', async () => {
      renderComponent({ mode: SharingPermissions.VIEW_ONLY });
      const row = screen.getByText('Pending User').closest('tr');
      const optionsButton = row.querySelector('button');
      expect(optionsButton).toBeInTheDocument();

      await userEvent.click(optionsButton);

      expect(screen.getByText('Resend invitation')).toBeInTheDocument();
      expect(screen.getByText('Delete invitation')).toBeInTheDocument();
      expect(screen.queryByText('Grant edit permissions')).not.toBeInTheDocument();
      expect(screen.queryByText('Revoke view permissions')).not.toBeInTheDocument();
    });

    it('displays the options dropdown with correct options for users who accepted invitations', async () => {
      renderComponent({ mode: SharingPermissions.VIEW_ONLY });
      const row = screen.getByText('Other User').closest('tr');
      const optionsButton = row.querySelector('button');
      expect(optionsButton).toBeInTheDocument();

      await userEvent.click(optionsButton);

      expect(screen.getByText('Grant edit permissions')).toBeInTheDocument();
      expect(screen.getByText('Revoke view permissions')).toBeInTheDocument();
      expect(screen.queryByText('Resend invitation')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete invitation')).not.toBeInTheDocument();
    });
  });

  describe(`clicking 'Resend invitation' menu option`, () => {
    it('should resend the invitation and show a success message', async () => {
      const user = userEvent.setup();

      renderComponent();
      const row = screen.getByText('Pending User').closest('tr');
      const optionsButton = row.querySelector('button');

      await userEvent.click(optionsButton);
      const resendOption = screen.getByText('Resend invitation');
      await user.click(resendOption);

      expect(mockActions.sendInvitation).toHaveBeenCalledWith(expect.any(Object), {
        email: 'pending@example.com',
        shareMode: SharingPermissions.VIEW_ONLY,
        channelId: channelId,
      });
    });
  });

  describe(`clicking 'Delete invitation' menu option`, () => {
    it('should open confirmation modal and delete invitation on confirm', async () => {
      const dialogMessage = `Are you sure you would like to delete the invitation for pending@example.com?`;
      const user = userEvent.setup();

      renderComponent();
      const row = screen.getByText('Pending User').closest('tr');
      const optionsButton = row.querySelector('button');

      expect(screen.queryByText(dialogMessage)).not.toBeInTheDocument();

      await userEvent.click(optionsButton);
      const deleteOption = screen.getByText('Delete invitation');
      await user.click(deleteOption);

      expect(screen.getByText(dialogMessage)).toBeInTheDocument();
      const confirmButton = screen.getByRole('button', { name: 'Delete invitation' });
      await user.click(confirmButton);

      expect(mockActions.deleteInvitation).toHaveBeenCalledWith(
        expect.any(Object),
        pendingInvitation.id,
      );
    });
  });

  describe(`clicking 'Grant edit permissions' menu option`, () => {
    it('should open confirmation modal and upgrade user on confirm', async () => {
      const dialogMessage = `Are you sure you would like to grant edit permissions to Other User?`;
      const user = userEvent.setup();

      renderComponent();
      const row = screen.getByText('Other User').closest('tr');
      const optionsButton = row.querySelector('button');

      expect(screen.queryByText(dialogMessage)).not.toBeInTheDocument();

      await userEvent.click(optionsButton);
      const grantOption = screen.getByText('Grant edit permissions');
      await user.click(grantOption);

      expect(screen.getByText(dialogMessage)).toBeInTheDocument();
      const confirmButton = screen.getByRole('button', { name: 'Yes, grant permissions' });
      await user.click(confirmButton);

      expect(mockActions.makeEditor).toHaveBeenCalledWith(expect.any(Object), {
        channelId,
        userId: otherUser.id,
      });
    });
  });

  describe(`clicking 'Revoke view permissions' menu option`, () => {
    it('should open confirmation modal and remove viewer on confirm', async () => {
      const dialogMessage = `Are you sure you would like to revoke view permissions for Other User?`;
      const user = userEvent.setup();

      renderComponent();
      const row = screen.getByText('Other User').closest('tr');
      const optionsButton = row.querySelector('button');

      expect(screen.queryByText(dialogMessage)).not.toBeInTheDocument();

      await userEvent.click(optionsButton);
      const revokeOption = screen.getByText('Revoke view permissions');
      await user.click(revokeOption);

      expect(screen.getByText(dialogMessage)).toBeInTheDocument();
      const confirmButton = screen.getByRole('button', { name: 'Yes, revoke' });
      await user.click(confirmButton);

      expect(mockActions.removeViewer).toHaveBeenCalledWith(expect.any(Object), {
        channelId,
        userId: otherUser.id,
      });
    });
  });
});
