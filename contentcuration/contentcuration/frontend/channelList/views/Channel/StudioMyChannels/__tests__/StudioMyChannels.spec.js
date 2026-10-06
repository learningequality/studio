import { render, screen, within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import StudioMyChannels from '../index.vue';
import { channelOrganizationFilterStrings as filterStrings } from 'shared/strings/channelOrganizationFilterStrings';
import { studioMyChannelsStrings as strings } from 'shared/strings/studioMyChannelsStrings';
import { Organization } from 'shared/data/resources';
import { ChannelListTypes } from 'shared/constants';
import { redirectBrowser } from 'shared/utils/navigation';

jest.mock('shared/utils/navigation', () => ({
  redirectBrowser: jest.fn(),
}));

const router = new VueRouter({
  routes: [
    { name: 'NEW_CHANNEL', path: '/new' },
    { name: 'NEW_ORGANIZATION', path: '/organizations/new' },
    { name: 'CHANNEL_DETAILS', path: '/:channelId/details' },
    { name: 'CHANNEL_EDIT', path: '/:channelId/:tab' },
  ],
});

const CHANNELS = [
  {
    id: 'channel-id-1',
    name: 'Channel title 1',
    organization: 'organization-1',
    organization_name: 'Learning Together',
    language: 'en',
    description: 'Channel description',
    edit: true,
    view: true,
    bookmark: false,
    published: true,
    primary_token: 'abc12-3def4',
    last_published: '2025-08-25T15:00:00Z',
    modified: '2026-01-10T08:00:00Z',
    source_url: 'https://source.example.com',
    demo_server_url: 'https://demo.example.com',
  },
  {
    id: 'channel-id-2',
    name: 'Channel title 2',
    language: 'en',
    description: 'Channel description',
    edit: true,
    view: true,
    bookmark: true,
    published: false,
    last_published: null,
    modified: '2026-01-10T08:00:00Z',
  },
];

const mockLoadChannelList = jest.fn();
const mockLoadInvitationList = jest.fn();
const mockDeleteChannel = jest.fn();
const mockBookmarkChannel = jest.fn();

function createStore(channelData = CHANNELS) {
  return new Store({
    state: {
      session: {
        currentUser: { id: 'user-id' },
      },
    },
    actions: {
      showSnackbarSimple: jest.fn(),
    },
    modules: {
      channel: {
        namespaced: true,
        getters: {
          channels: () => channelData,
          getChannel: () => id => channelData.find(c => c.id === id),
        },
        actions: {
          loadChannelList: mockLoadChannelList,
          deleteChannel: mockDeleteChannel,
          bookmarkChannel: mockBookmarkChannel,
        },
      },
      channelList: {
        namespaced: true,
        getters: {
          invitations: () => [],
          getInvitation: () => () => {},
        },
        actions: {
          loadInvitationList: mockLoadInvitationList,
        },
      },
    },
  });
}

function renderComponent(props = {}, channelData = CHANNELS) {
  return render(StudioMyChannels, {
    store: createStore(channelData),
    routes: router,
    props: {
      ...props,
    },
  });
}

describe('StudioMyChannels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Organization, 'fetchCollection').mockResolvedValue([]);
    router.push('/').catch(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls the load channel list action with correct parameters on mount', () => {
    renderComponent();
    expect(mockLoadChannelList).toHaveBeenCalledTimes(1);
    expect(mockLoadChannelList).toHaveBeenCalledWith(expect.anything(), {
      listType: ChannelListTypes.EDITABLE,
    });
  });

  it('calls the load invitations action on mount', () => {
    renderComponent();
    expect(mockLoadInvitationList).toHaveBeenCalled();
  });

  describe('organization filter', () => {
    async function chooseOrganization(label) {
      const filter = within(await screen.findByTestId('organization-filter'));
      await userEvent.click(filter.getByText(filterStrings.filterByOrganization$()));
      // KSelect renders its options in the overlay, outside the filter control.
      await userEvent.click(await screen.findByText(label));
    }

    it('selects memberships without channel metadata and clears the filter to restore channels', async () => {
      const memberships = [
        { id: 'one', name: 'Aurora' },
        { id: 'two', name: 'Beacon' },
        { id: 'three', name: 'Cedar' },
      ];
      Organization.fetchCollection.mockResolvedValue(memberships);
      renderComponent(
        {},
        CHANNELS.map(channel => ({
          ...channel,
          organization: undefined,
          organization_name: undefined,
        })),
      );
      expect(await screen.findAllByTestId('channel-card')).toHaveLength(2);
      for (const organization of memberships) {
        await chooseOrganization(organization.name);
        await waitFor(() => expect(router.currentRoute.query.organization).toBe(organization.id));
        expect(screen.queryAllByTestId('channel-card')).toHaveLength(0);
      }
      expect(Organization.fetchCollection).toHaveBeenCalledWith({ member: true, page_size: 100 });
      await chooseOrganization(filterStrings.allOrganizations$());
      await waitFor(() => expect(screen.getAllByTestId('channel-card')).toHaveLength(2));
      expect(router.currentRoute.query.organization).toBeUndefined();
    });

    it('retries a failed membership lookup and filters using the recovered membership', async () => {
      Organization.fetchCollection.mockRejectedValueOnce(new Error('Network error'));
      renderComponent();
      expect(await screen.findByRole('alert')).toHaveTextContent(filterStrings.loadError$());
      expect(await screen.findAllByTestId('channel-card')).toHaveLength(2);
      Organization.fetchCollection.mockResolvedValue([
        { id: 'retry-org', name: 'Recovered organization' },
      ]);
      await userEvent.click(screen.getByRole('button', { name: filterStrings.retry$() }));
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      await chooseOrganization('Recovered organization');
      await waitFor(() => expect(router.currentRoute.query.organization).toBe('retry-org'));
      expect(screen.queryAllByTestId('channel-card')).toHaveLength(0);
    });

    it('deduplicates organizations and keeps other options available after filtering', async () => {
      renderComponent({}, [
        ...CHANNELS,
        { ...CHANNELS[0], id: 'channel-id-3', name: 'Third channel' },
        {
          ...CHANNELS[0],
          id: 'channel-id-4',
          name: 'Fourth channel',
          organization: 'organization-2',
          organization_name: 'Another organization',
        },
        {
          ...CHANNELS[0],
          id: 'deleted',
          deleted: true,
          organization: 'deleted-org',
          organization_name: 'Deleted organization',
        },
        {
          ...CHANNELS[0],
          id: 'view-only',
          edit: false,
          organization: 'viewer-org',
          organization_name: 'Viewer organization',
        },
      ]);
      expect(await screen.findAllByTestId('channel-card')).toHaveLength(4);
      await chooseOrganization('Learning Together');
      await waitFor(() => expect(screen.getAllByTestId('channel-card')).toHaveLength(2));
      await userEvent.click(
        within(screen.getByTestId('organization-filter')).getByText(
          filterStrings.filterByOrganization$(),
        ),
      );
      expect(screen.queryByText('Deleted organization')).not.toBeInTheDocument();
      expect(screen.queryByText('Viewer organization')).not.toBeInTheDocument();
      await userEvent.click(screen.getByText('Another organization'));
      await waitFor(() => expect(screen.getAllByTestId('channel-card')).toHaveLength(1));
      expect(screen.getByTestId('channel-card')).toHaveTextContent('Fourth channel');
    });

    it('filters from the URL and preserves unrelated query parameters when cleared', async () => {
      await router.push({ query: { organization: 'organization-1', other: 'keep' } });
      renderComponent();
      const cards = await screen.findAllByTestId('channel-card');
      expect(cards).toHaveLength(1);
      expect(cards[0]).toHaveTextContent(CHANNELS[0].name);
      await chooseOrganization(filterStrings.allOrganizations$());
      await waitFor(() => expect(screen.getAllByTestId('channel-card')).toHaveLength(2));
      expect(router.currentRoute.query).toEqual({ other: 'keep' });
    });

    it('restores the list when navigating back after selecting an organization', async () => {
      renderComponent();
      await screen.findAllByTestId('channel-card');
      await chooseOrganization('Learning Together');
      await waitFor(() => expect(screen.getAllByTestId('channel-card')).toHaveLength(1));
      expect(router.currentRoute.query.organization).toBe('organization-1');
      router.back();
      await waitFor(() => expect(screen.getAllByTestId('channel-card')).toHaveLength(2));
    });

    it('can clear an unavailable organization without silently showing unrelated channels', async () => {
      await router.push({ query: { organization: 'unavailable' } });
      renderComponent();
      await waitFor(() =>
        expect(
          within(screen.getByTestId('organization-filter')).getByText(
            filterStrings.unavailableOrganization$(),
          ),
        ).toBeInTheDocument(),
      );
      expect(screen.queryAllByTestId('channel-card')).toHaveLength(0);
      await chooseOrganization(filterStrings.allOrganizations$());
      await waitFor(() => expect(screen.getAllByTestId('channel-card')).toHaveLength(2));
    });
  });

  it('navigates to the new channel route when the new channel button clicked', async () => {
    renderComponent();

    // Wait for loading to complete by waiting for channel cards to appear,
    // otherwise button click silently fails
    await screen.findAllByTestId('channel-card');

    const newChannelButton = screen.getByRole('button', { name: strings.newChannel$() });

    expect(router.currentRoute.path).toBe('/');
    await userEvent.click(newChannelButton);
    await waitFor(() => {
      expect(router.currentRoute.path).toBe('/new');
    });
  });

  it('navigates to the new organization route from the filter actions', async () => {
    renderComponent();
    await screen.findAllByTestId('channel-card');

    await userEvent.click(screen.getByRole('button', { name: strings.createOrganization$() }));

    await waitFor(() => {
      expect(router.currentRoute.path).toBe('/organizations/new');
    });
  });

  it('navigates to channel via window.location when card clicked', async () => {
    renderComponent();
    const cards = await screen.findAllByTestId('channel-card');
    await userEvent.click(cards[0]);

    expect(redirectBrowser).toHaveBeenCalledWith('channel');
  });

  describe('cards footer actions', () => {
    async function openDropdownForCard(cardIndex = 0) {
      renderComponent();
      await screen.findAllByTestId('channel-card');
      const dropdownButtons = screen.getAllByRole('button', { name: strings.moreOptions$() });
      await userEvent.click(dropdownButtons[cardIndex]);
      return screen.getByRole('menu');
    }

    it('navigates to edit page when edit option is clicked', async () => {
      const menu = await openDropdownForCard(0);
      expect(router.currentRoute.path).toBe('/');
      await userEvent.click(within(menu).getByText(strings.editChannel$()));
      await waitFor(() => {
        expect(router.currentRoute.path).toBe('/channel-id-1/edit');
      });
    });

    it('opens delete modal when delete option is clicked', async () => {
      const menu = await openDropdownForCard(0);
      await userEvent.click(within(menu).getByText(strings.deleteChannel$()));
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('does not show copy token option when channel is not published', async () => {
      const menu = await openDropdownForCard(1);
      expect(within(menu).queryByText(strings.copyToken$())).not.toBeInTheDocument();
    });

    it('opens copy token modal when "Copy channel token" is clicked', async () => {
      const menu = await openDropdownForCard(0);
      await userEvent.click(within(menu).getByText(strings.copyToken$()));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByRole('textbox')).toHaveValue(CHANNELS[0].primary_token);
    });

    it('opens source URL in new tab when source website option is clicked', async () => {
      jest.spyOn(window, 'open').mockImplementation(() => {});
      const menu = await openDropdownForCard(0);
      await userEvent.click(within(menu).getByText(strings.goToWebsite$()));
      expect(window.open).toHaveBeenCalledWith('https://source.example.com', '_blank');
    });

    it('opens demo URL in new tab when view on Kolibri is clicked', async () => {
      jest.spyOn(window, 'open').mockImplementation(() => {});
      const menu = await openDropdownForCard(0);
      await userEvent.click(within(menu).getByText(strings.viewContent$()));
      expect(window.open).toHaveBeenCalledWith('https://demo.example.com', '_blank');
    });
  });
});
