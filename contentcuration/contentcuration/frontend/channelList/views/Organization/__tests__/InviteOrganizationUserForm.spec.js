import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex, { Store } from 'vuex';
import InviteOrganizationUserForm from '../InviteOrganizationUserForm.vue';

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

describe('InviteOrganizationUserForm', () => {
  it('does not send an invitation when the email is blank', async () => {
    const sendInvitation = jest.fn();
    render(InviteOrganizationUserForm, {
      localVue,
      router,
      store: createStore(),
      props: { organizationId: 'org-1', sendInvitation },
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(sendInvitation).not.toHaveBeenCalled();
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
  });

  it('sends the invitation with the entered email and selected role', async () => {
    const sendInvitation = jest.fn().mockResolvedValue({});
    render(InviteOrganizationUserForm, {
      localVue,
      router,
      store: createStore(),
      props: { organizationId: 'org-1', sendInvitation },
    });

    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(sendInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      email: 'new@example.com',
      shareMode: 'view',
    });
  });
});
