import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex, { Store } from 'vuex';
import StudioMyOrganizations from '../StudioMyOrganizations.vue';
import { Organization, Invitation } from 'shared/data/resources';

const localVue = createLocalVue();
localVue.use(VueRouter);
localVue.use(Vuex);

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

describe('StudioMyOrganizations', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the empty state when the user has no organizations', async () => {
    const router = new VueRouter({
      routes: [{ path: '/my-organizations', component: StudioMyOrganizations }],
    });

    render(StudioMyOrganizations, { localVue, router, store: createStore() });

    expect(screen.getByRole('heading', { name: 'Organizations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New organization' })).toBeInTheDocument();
    expect(
      await screen.findByText('You are not a member of any organizations yet.'),
    ).toBeInTheDocument();
  });

  it('renders a card for each organization the user belongs to', async () => {
    jest.spyOn(Organization, 'fetchCollection').mockResolvedValue([
      { id: 'org-1', name: 'Org One', description: 'First org', role: 'admin' },
      { id: 'org-2', name: 'Org Two', description: 'Second org', role: 'viewer' },
    ]);
    const router = new VueRouter({
      routes: [{ path: '/my-organizations', component: StudioMyOrganizations }],
    });

    render(StudioMyOrganizations, { localVue, router, store: createStore() });

    expect((await screen.findAllByText('Org One')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Org Two').length).toBeGreaterThan(0);
    expect(
      screen.queryByText('You are not a member of any organizations yet.'),
    ).not.toBeInTheDocument();
  });

  it('renders pending organization invitations and lets the user accept them', async () => {
    jest.spyOn(Invitation, 'fetchCollection').mockResolvedValue([
      {
        id: 'invite-1',
        organization: 'org-1',
        organization_name: 'Org One',
        sender_name: 'Admin User',
        share_mode: 'edit',
        accepted: false,
        declined: false,
        revoked: false,
      },
    ]);
    const accept = jest.spyOn(Invitation, 'accept').mockResolvedValue();
    const router = new VueRouter({
      routes: [{ path: '/my-organizations', component: StudioMyOrganizations }],
    });

    const { container } = render(StudioMyOrganizations, {
      localVue,
      router,
      store: createStore(),
    });

    expect(
      await screen.findByText('Admin User has invited you to edit Org One'),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(container.querySelector('[data-test="accept"]'));

    expect(accept).toHaveBeenCalledWith('invite-1');
    expect(
      screen.queryByText('Admin User has invited you to edit Org One'),
    ).not.toBeInTheDocument();
  });
});
