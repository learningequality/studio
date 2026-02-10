import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import StudioStarredChannels from '../index';
import { ChannelListTypes } from 'shared/constants';

const router = new VueRouter({
  routes: [
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
    bookmark: true,
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

const mockLoadChannelList = jest.fn();

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
  },
});

function renderComponent(props = {}) {
  return render(StudioStarredChannels, {
    store,
    props: {
      ...props,
    },
    routes: router,
  });
}

describe('StudioStarredChannels', () => {
  it('calls the load channel list action with correct parameters on mount', () => {
    renderComponent();
    expect(mockLoadChannelList).toHaveBeenCalledTimes(1);
    expect(mockLoadChannelList).toHaveBeenCalledWith(expect.anything(), {
      listType: ChannelListTypes.STARRED,
    });
  });

  it('shows the visually hidden title and all channel cards in correct semantic structure', async () => {
    renderComponent();
    const title = screen.getByRole('heading', { name: /starred channels/i });
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
});
