import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex, { Store } from 'vuex';
import StudioMyOrganizations from '../StudioMyOrganizations.vue';
import { Organization, Invitation } from 'shared/data/resources';
import { organizationStrings } from 'shared/strings/organizationStrings';

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
      await screen.findByText(
        organizationStrings.editText$({ sender: 'Admin User', organization: 'Org One' }),
      ),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(container.querySelector('[data-test="accept"]'));

    expect(accept).toHaveBeenCalledWith('invite-1');
    expect(
      screen.queryByText(
        organizationStrings.editText$({ sender: 'Admin User', organization: 'Org One' }),
      ),
    ).not.toBeInTheDocument();
  });

  it('refreshes the organization list after accepting an invitation', async () => {
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
    jest.spyOn(Invitation, 'accept').mockResolvedValue();
    const fetchCollection = jest
      .spyOn(Organization, 'fetchCollection')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'org-1', name: 'Org One', description: '', role: 'editor' }]);
    const router = new VueRouter({
      routes: [{ path: '/my-organizations', component: StudioMyOrganizations }],
    });

    const { container } = render(StudioMyOrganizations, {
      localVue,
      router,
      store: createStore(),
    });

    expect(
      await screen.findByText(organizationStrings.noOrganizationsFound$()),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(container.querySelector('[data-test="accept"]'));

    expect((await screen.findAllByText('Org One')).length).toBeGreaterThan(0);
    expect(fetchCollection).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByText(organizationStrings.noOrganizationsFound$()),
    ).not.toBeInTheDocument();
  });
});
