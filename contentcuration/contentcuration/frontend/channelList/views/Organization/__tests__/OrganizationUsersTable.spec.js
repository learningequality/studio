import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex, { Store } from 'vuex';
import OrganizationUsersTable from '../OrganizationUsersTable.vue';

const localVue = createLocalVue();
localVue.use(VueRouter);
localVue.use(Vuex);

const router = new VueRouter();

const createStore = () => {
  return new Store({
    getters: {
      snackbarIsVisible: () => false,
      snackbarOptions: () => null,
    },
    actions: {
      showSnackbar: jest.fn(),
    },
  });
};

const baseProps = () => ({
  members: [
    {
      id: 'role-1',
      user_first_name: 'Ann',
      user_last_name: 'Admin',
      user_name: 'Ann Admin',
      user_email: 'ann@example.com',
      role: 'admin',
    },
    {
      id: 'role-2',
      user_first_name: 'Bob',
      user_last_name: 'Viewer',
      user_name: 'Bob Viewer',
      user_email: 'bob@example.com',
      role: 'viewer',
    },
  ],
  invitations: [
    {
      id: 'invite-1',
      first_name: '',
      last_name: '',
      email: 'pending@example.com',
      share_mode: 'edit',
    },
  ],
  loading: false,
  changeRole: jest.fn().mockResolvedValue({}),
  closeMemberRole: jest.fn().mockResolvedValue({}),
  resendInvitation: jest.fn().mockResolvedValue({}),
  revokeInvitation: jest.fn().mockResolvedValue({}),
});

describe('OrganizationUsersTable', () => {
  it('renders a row for each active member and each pending invitation', () => {
    render(OrganizationUsersTable, { localVue, router, store: createStore(), props: baseProps() });

    expect(screen.getByText('Ann Admin')).toBeInTheDocument();
    expect(screen.getByText('ann@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('pending@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText('Pending Editor')).toBeInTheDocument();
  });

  it('resends the invitation when "Resend invitation" is selected', async () => {
    const props = baseProps();
    render(OrganizationUsersTable, { localVue, router, store: createStore(), props });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Options for pending@example.com' }));
    await user.click(screen.getByText('Resend invitation'));

    expect(props.resendInvitation).toHaveBeenCalledWith('invite-1');
  });

  it('closes a member role after confirming the modal', async () => {
    const props = baseProps();
    render(OrganizationUsersTable, { localVue, router, store: createStore(), props });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Options for bob@example.com' }));
    await user.click(screen.getByText('Remove from organization'));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(props.closeMemberRole).toHaveBeenCalledWith('role-2');
  });

  it('hides the options button for the sole active admin', () => {
    render(OrganizationUsersTable, { localVue, router, store: createStore(), props: baseProps() });

    expect(
      screen.queryByRole('button', { name: 'Options for ann@example.com' }),
    ).not.toBeInTheDocument();
  });

  it('shows the options button for an admin when another active admin exists', () => {
    const props = baseProps();
    props.members.push({
      id: 'role-3',
      user_first_name: 'Cara',
      user_last_name: 'Admin',
      user_name: 'Cara Admin',
      user_email: 'cara@example.com',
      role: 'admin',
    });
    render(OrganizationUsersTable, { localVue, router, store: createStore(), props });

    expect(screen.getByRole('button', { name: 'Options for ann@example.com' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Options for cara@example.com' }),
    ).toBeInTheDocument();
  });
});
