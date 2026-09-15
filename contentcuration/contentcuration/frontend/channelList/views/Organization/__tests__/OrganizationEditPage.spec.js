import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex, { Store } from 'vuex';
import OrganizationEditPage from '../OrganizationEditPage.vue';
import { RouteNames } from '../../../constants';
import { Organization } from 'shared/data/resources';
import { organizationStrings } from 'shared/strings/organizationStrings';

const localVue = createLocalVue();
localVue.use(VueRouter);
localVue.use(Vuex);

const createStore = () => {
  return new Store({
    state: {
      connection: { online: true },
    },
    getters: {
      snackbarIsVisible: () => false,
      snackbarOptions: () => null,
    },
    actions: {
      showSnackbar: jest.fn(),
    },
  });
};

const createRouter = initialPath => {
  const router = new VueRouter({
    routes: [
      {
        name: RouteNames.NEW_ORGANIZATION,
        path: '/organization/new',
        component: OrganizationEditPage,
        props: true,
      },
      {
        name: RouteNames.ORGANIZATION_EDIT,
        path: '/organization/:organizationId/:tab',
        component: OrganizationEditPage,
        props: true,
      },
      {
        name: RouteNames.MY_ORGANIZATIONS,
        path: '/my-organizations',
        component: { template: '<div>My organizations</div>' },
      },
    ],
  });
  router.push(initialPath);
  return router;
};

describe('OrganizationEditPage', () => {
  beforeEach(() => {
    jest.spyOn(Organization, 'fetchModel').mockResolvedValue({ id: 'org-1', name: 'Acme', description: '' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the organization name and the details tab by default', async () => {
    const router = createRouter('/organization/org-1/details');
    render(OrganizationEditPage, {
      localVue,
      router,
      store: createStore(),
      props: { organizationId: 'org-1', tab: 'details' },
    });

    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Organization name' })).toBeInTheDocument();
  });

  it('shows nothing on the sharing tab', async () => {
    const router = createRouter('/organization/org-1/sharing');
    render(OrganizationEditPage, {
      localVue,
      router,
      store: createStore(),
      props: { organizationId: 'org-1', tab: 'sharing' },
    });

    await screen.findByText('Acme');
    expect(screen.queryByRole('textbox', { name: 'Organization name' })).not.toBeInTheDocument();
  });

  it('navigates to the "last" route when the close button is clicked', async () => {
    const router = createRouter('/organization/org-1/details?last=' + RouteNames.MY_ORGANIZATIONS);
    render(OrganizationEditPage, {
      localVue,
      router,
      store: createStore(),
      props: { organizationId: 'org-1', tab: 'details' },
    });

    await screen.findByText('Acme');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(router.currentRoute.name).toBe(RouteNames.MY_ORGANIZATIONS);
  });

  it("navigates to the new organization's edit page after creating it, with no Sharing tab while creating", async () => {
    jest.spyOn(Organization, 'create').mockResolvedValue({ id: 'org-2', name: 'New Org', description: '' });
    const router = createRouter('/organization/new');
    render(OrganizationEditPage, {
      localVue,
      router,
      store: createStore(),
      props: {},
    });

    expect(screen.queryByRole('tab', { name: organizationStrings.sharingTab$() })).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Organization name' }), 'New Org');
    await user.click(
      screen.getByRole('button', { name: organizationStrings.createOrganization$() }),
    );

    await screen.findByRole('textbox', { name: 'Organization name' });
    expect(router.currentRoute.name).toBe(RouteNames.ORGANIZATION_EDIT);
    expect(router.currentRoute.params).toMatchObject({ organizationId: 'org-2', tab: 'details' });
  });
});
