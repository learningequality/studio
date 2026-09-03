import { render, screen } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex, { Store } from 'vuex';
import OrganizationSharingTab from '../OrganizationSharingTab.vue';

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

describe('OrganizationSharingTab', () => {
  it('shows the invite form and users table to an admin', async () => {
    render(OrganizationSharingTab, {
      localVue,
      router,
      store: createStore(),
      props: { organizationId: 'org-1', isAdmin: true },
    });

    expect(await screen.findByText('Invite users')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows a message instead of the form to a non-admin', () => {
    render(OrganizationSharingTab, {
      localVue,
      router,
      store: createStore(),
      props: { organizationId: 'org-1', isAdmin: false },
    });

    expect(
      screen.getByText('Only organization admins can manage sharing settings.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Invite users')).not.toBeInTheDocument();
  });
});
