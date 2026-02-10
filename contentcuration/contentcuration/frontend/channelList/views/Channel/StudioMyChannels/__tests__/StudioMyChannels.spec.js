import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import StudioMyChannels from '../index.vue';
import { ChannelListTypes } from 'shared/constants';

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
    last_published: '2025-08-25T15:00:00Z',
    modified: '2026-01-10T08:00:00Z',
  },
  {
    id: 'channel-id-2',
    name: 'Channel title 2',
    language: 'en',
    description: 'Channel description',
    edit: true,
    view: true,
    bookmark: true,
    last_published: '2025-08-25T15:00:00Z',
    modified: '2026-01-10T08:00:00Z',
  },
];

const INVITATION = {
  id: 'invitation-1',
  accepted: false,
  sender_name: 'User A',
  channel_name: 'Channel A',
  share_mode: 'edit',
};

const mockLoadChannelList = jest.fn();
const mockLoadInvitationList = jest.fn();

const store = new Store({
  modules: {
    channel: {
      namespaced: true,
      getters: {
        channels: () => CHANNELS,
      },
      actions: {
        loadChannelList: mockLoadChannelList,
      },
    },
    channelList: {
      namespaced: true,
      getters: {
        invitations: () => [INVITATION],
        getInvitation: () => () => INVITATION,
      },
      actions: {
        loadInvitationList: mockLoadInvitationList,
      },
    },
  },
});

function renderComponent(props = {}) {
  return render(StudioMyChannels, {
    store,
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

  it('calls the load channel list action with correct parameters on mount', () => {
    renderComponent();
    expect(mockLoadChannelList).toHaveBeenCalledTimes(1);
    expect(mockLoadChannelList).toHaveBeenCalledWith(expect.anything(), {
      listType: ChannelListTypes.EDITABLE,
    });
  });

  it('calls the load invitations action on mount', () => {
    renderComponent();
    expect(mockLoadInvitationList).toHaveBeenCalledTimes(1);
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

  it('shows invitations', () => {
    renderComponent();
    expect(screen.getByText('You have 1 invitation'));
    expect(screen.getByText('User A has invited you to edit Channel A'));
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
});
