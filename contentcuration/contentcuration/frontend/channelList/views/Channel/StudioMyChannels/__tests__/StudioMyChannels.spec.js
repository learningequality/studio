import { render, screen, within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import StudioMyChannels from '../index.vue';
import { ChannelListTypes } from 'shared/constants';

const originalLocation = window.location;

const router = new VueRouter({
  routes: [
    { name: 'NEW_CHANNEL', path: '/new' },
    { name: 'CHANNEL_DETAILS', path: '/:channelId/details' },
    { name: 'CHANNEL_EDIT', path: '/:channelId/:tab' },
  ],
});

const CHANNELS = [
  {
    id: 'channel-id-1',
    name: 'Channel title 1',
    language: 'en',
    description: 'Channel description',
    edit: true,
    view: true,
    bookmark: false,
    published: true,
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

function createStore() {
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
          channels: () => CHANNELS,
          getChannel: () => id => CHANNELS.find(c => c.id === id),
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

function renderComponent(props = {}) {
  return render(StudioMyChannels, {
    store: createStore(),
    routes: router,
    props: {
      ...props,
    },
  });
}

describe('StudioMyChannels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    router.push('/').catch(() => {});
  });

  afterEach(() => {
    window.location = originalLocation;
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

  it('shows the visually hidden title and all channel cards in correct semantic structure', async () => {
    renderComponent();
    const title = screen.getByRole('heading', { name: /my channels/i });
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H1');
    expect(title).toHaveClass('visuallyhidden');

    const cards = await screen.findAllByTestId('channel-card');
    expect(cards).toHaveLength(CHANNELS.length);
    expect(cards[0]).toHaveTextContent('Channel title 1');
    expect(cards[0].querySelector('h2')).toBeInTheDocument();
    expect(cards[1]).toHaveTextContent('Channel title 2');
    expect(cards[1].querySelector('h2')).toBeInTheDocument();
  });

  it('navigates to the new channel route when the new channel button clicked', async () => {
    renderComponent();

    // Wait for loading to complete by waiting for channel cards to appear,
    // otherwise button click silently fails
    await screen.findAllByTestId('channel-card');

    const newChannelButton = screen.getByRole('button', { name: /new channel/i });

    expect(router.currentRoute.path).toBe('/');
    await userEvent.click(newChannelButton);
    await waitFor(() => {
      expect(router.currentRoute.path).toBe('/new');
    });
  });

  it('navigates to channel via window.location when card clicked', async () => {
    delete window.location;
    window.location = { ...originalLocation, href: '' };

    renderComponent();
    const cards = await screen.findAllByTestId('channel-card');
    await userEvent.click(cards[0]);

    expect(window.location.href).toBe('channel');
  });

  describe('cards footer actions', () => {
    async function openDropdownForCard(cardIndex = 0) {
      renderComponent();
      await screen.findAllByTestId('channel-card');
      const dropdownButtons = screen.getAllByRole('button', { name: 'More options' });
      await userEvent.click(dropdownButtons[cardIndex]);
      return screen.getByRole('menu');
    }

    it('shows bookmark button', async () => {
      renderComponent();
      await screen.findAllByTestId('channel-card');
      const bookmarkButtons = screen.getAllByRole('button', { name: /starred channels/i });
      expect(bookmarkButtons).toHaveLength(CHANNELS.length);
    });

    it('shows more options dropdown button', async () => {
      renderComponent();
      await screen.findAllByTestId('channel-card');
      const dropdownButtons = screen.getAllByRole('button', { name: 'More options' });
      expect(dropdownButtons).toHaveLength(CHANNELS.length);
    });

    it('does not show remove option', async () => {
      renderComponent();
      expect(screen.queryByText('Remove channel')).not.toBeInTheDocument();
    });

    it('shows edit and delete dropdown options', async () => {
      const menu = await openDropdownForCard(0);
      expect(within(menu).getByText('Edit channel details')).toBeInTheDocument();
      expect(within(menu).getByText('Delete channel')).toBeInTheDocument();
    });

    it('navigates to edit page when edit option is clicked', async () => {
      const menu = await openDropdownForCard(0);
      expect(router.currentRoute.path).toBe('/');
      await userEvent.click(within(menu).getByText('Edit channel details'));
      await waitFor(() => {
        expect(router.currentRoute.path).toBe('/channel-id-1/edit');
      });
    });

    it('opens delete modal when delete option is clicked', async () => {
      const menu = await openDropdownForCard(0);
      await userEvent.click(within(menu).getByText('Delete channel'));
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText('Delete this channel')).toBeInTheDocument();
    });

    it('does not show copy token option when channel is not published', async () => {
      const menu = await openDropdownForCard(1);
      expect(within(menu).queryByText('Copy channel token')).not.toBeInTheDocument();
    });

    it('shows copy token option when channel is published', async () => {
      const menu = await openDropdownForCard(0);
      expect(within(menu).getByText('Copy channel token')).toBeInTheDocument();
    });

    it('opens copy token modal when "Copy channel token" is clicked', async () => {
      const menu = await openDropdownForCard(0);
      await userEvent.click(within(menu).getByText('Copy channel token'));
      await waitFor(() => {
        expect(
          screen.getByText('Paste this token into Kolibri to import this channel'),
        ).toBeInTheDocument();
      });
    });

    it('shows source website option when channel has source_url', async () => {
      const menu = await openDropdownForCard(0);
      expect(within(menu).getByText('Go to source website')).toBeInTheDocument();
    });

    it('opens source URL in new tab when source website option is clicked', async () => {
      window.open = jest.fn();
      const menu = await openDropdownForCard(0);
      await userEvent.click(within(menu).getByText('Go to source website'));
      expect(window.open).toHaveBeenCalledWith('https://source.example.com', '_blank');
    });

    it('shows view on Kolibri option when channel has demo_server_url', async () => {
      const menu = await openDropdownForCard(0);
      expect(within(menu).getByText('View channel on Kolibri')).toBeInTheDocument();
    });

    it('opens demo URL in new tab when view on Kolibri is clicked', async () => {
      window.open = jest.fn();
      const menu = await openDropdownForCard(0);
      await userEvent.click(within(menu).getByText('View channel on Kolibri'));
      expect(window.open).toHaveBeenCalledWith('https://demo.example.com', '_blank');
    });
  });
});
