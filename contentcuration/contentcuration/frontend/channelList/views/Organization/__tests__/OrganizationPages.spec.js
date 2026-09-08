import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import NewOrganization from '../NewOrganization.vue';
import OrganizationDetails from '../OrganizationDetails.vue';
import StudioOrganizations from '../StudioOrganizations.vue';
import { RouteNames } from '../../../constants';
import { Channel, Organization, OrganizationMember } from 'shared/data/resources';

jest.mock('shared/data/resources', () => ({
  Channel: { where: jest.fn() },
  Organization: {
    fetchCollection: jest.fn(),
    fetchModel: jest.fn(),
    create: jest.fn(),
  },
  OrganizationMember: { fetchCollection: jest.fn() },
}));

const organizations = [
  {
    id: 'organization-1',
    name: 'Learning Together',
    description: 'Learning resources for everyone',
    public: true,
  },
  {
    id: 'organization-2',
    name: 'Private team',
    description: '',
    public: false,
  },
];

function makeRouter() {
  return new VueRouter({
    routes: [
      { name: RouteNames.ORGANIZATIONS, path: '/organizations', component: StudioOrganizations },
      { name: RouteNames.NEW_ORGANIZATION, path: '/organizations/new', component: NewOrganization },
      {
        name: RouteNames.ORGANIZATION_DETAILS,
        path: '/organizations/:organizationId',
        component: OrganizationDetails,
        props: true,
      },
    ],
  });
}

describe('organization pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Organization.fetchCollection.mockResolvedValue({ results: organizations });
    Organization.fetchModel.mockResolvedValue(organizations[0]);
    OrganizationMember.fetchCollection.mockResolvedValue({
      results: [
        {
          id: 'membership-1',
          user_name: 'Taylor Doe',
          user_email: 'taylor@example.com',
          role: 'admin',
          status: 'active',
        },
      ],
    });
    Channel.where.mockResolvedValue([
      {
        id: 'channel-1',
        name: 'Organization channel',
        description: 'Channel description',
        organization: 'organization-1',
        published: true,
      },
      {
        id: 'channel-2',
        name: 'Unrelated channel',
        organization: 'organization-2',
      },
    ]);
  });

  it('lists accessible public and member organizations', async () => {
    const router = makeRouter();
    render(StudioOrganizations, { routes: router });

    expect(await screen.findAllByTestId('organization-card')).toHaveLength(2);
    expect(screen.getAllByText('Learning Together').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Private team').length).toBeGreaterThan(0);
    expect(Organization.fetchCollection).toHaveBeenCalledWith({
      page_size: 100,
      ordering: 'name',
    });
  });

  it('opens an organization from its card', async () => {
    const router = makeRouter();
    render(StudioOrganizations, { routes: router });
    const cards = await screen.findAllByTestId('organization-card');
    await userEvent.click(cards[0]);
    await waitFor(() => expect(router.currentRoute.path).toBe('/organizations/organization-1'));
  });

  it('validates and creates an organization', async () => {
    const router = makeRouter();
    Organization.create.mockResolvedValue({ id: 'new-organization' });
    render(NewOrganization, { routes: router });

    await userEvent.click(screen.getByRole('button', { name: 'Create organization' }));
    expect(await screen.findByText('Organization name is required')).toBeInTheDocument();
    expect(Organization.create).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Organization name'), 'New organization');
    await userEvent.type(screen.getByLabelText('Organization description'), 'A description');
    await userEvent.click(screen.getByRole('checkbox', { name: /public/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Create organization' }));

    await waitFor(() =>
      expect(Organization.create).toHaveBeenCalledWith({
        name: 'New organization',
        description: 'A description',
        public: true,
      }),
    );
    expect(router.currentRoute.path).toBe('/organizations/new-organization');
  });

  it('shows organization details and only associated channels', async () => {
    const router = makeRouter();
    await router.push('/organizations/organization-1');
    render(OrganizationDetails, {
      routes: router,
      props: { organizationId: 'organization-1' },
    });

    expect(await screen.findByRole('heading', { name: 'Learning Together' })).toBeInTheDocument();
    expect(screen.getByText('Organization channel')).toBeInTheDocument();
    expect(screen.queryByText('Unrelated channel')).not.toBeInTheDocument();
    expect(Channel.where).toHaveBeenCalledWith({ edit: true }, true);
    expect(Channel.where).toHaveBeenCalledWith({ view: true }, true);
    expect(Channel.where).toHaveBeenCalledWith({ public: true }, true);
  });

  it('shows organization members on the users tab', async () => {
    const router = makeRouter();
    await router.push('/organizations/organization-1?tab=users');
    render(OrganizationDetails, {
      routes: router,
      props: { organizationId: 'organization-1' },
    });

    expect(await screen.findByText('Taylor Doe')).toBeInTheDocument();
    expect(screen.getByText('taylor@example.com')).toBeInTheDocument();
    expect(OrganizationMember.fetchCollection).toHaveBeenCalledWith({
      organization: 'organization-1',
      page_size: 100,
    });
  });

  it('does not display unrelated channels when association metadata is unavailable', async () => {
    Channel.where.mockResolvedValue([{ id: 'channel-1', name: 'Unscoped channel' }]);
    const router = makeRouter();
    await router.push('/organizations/organization-1');
    render(OrganizationDetails, {
      routes: router,
      props: { organizationId: 'organization-1' },
    });

    expect(
      await screen.findByText('Channel information is not available yet.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Unscoped channel')).not.toBeInTheDocument();
  });
});
