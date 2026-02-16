import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import CatalogList from '../CatalogList.vue';
import { RouteNames } from '../../../constants';

const originalLocation = window.location;

const CHANNELS = [
  {
    id: 'channel-1',
    name: 'Channel title 1',
    description: 'Test channel 1',
    language: 'en',
    modified: new Date('2024-01-15'),
    last_published: new Date('2024-01-10'),
  },
  {
    id: 'channel-2',
    name: 'Channel title 2',
    description: 'Test channel 2',
    language: 'en',
    modified: new Date('2024-01-20'),
    last_published: new Date('2024-01-18'),
  },
];

const CHANNEL_IDS = CHANNELS.map(c => c.id);

const router = new VueRouter({
  routes: [
    { name: RouteNames.CHANNEL_DETAILS, path: '/:channelId/details' },
    { name: RouteNames.CATALOG_ITEMS, path: '/catalog' },
    { name: RouteNames.CATALOG_DETAILS, path: '/catalog/:channelId' },
  ],
});

const mockSearchCatalog = jest.fn(() => Promise.resolve());

function createStore({ loggedIn = true } = {}) {
  return new Store({
    state: {
      connection: { online: true },
    },
    getters: {
      loggedIn: () => loggedIn,
    },
    modules: {
      channel: {
        namespaced: true,
        state: {
          channelsMap: Object.fromEntries(CHANNELS.map(c => [c.id, c])),
        },
        getters: {
          getChannels: state => ids => ids.map(id => state.channelsMap[id]).filter(Boolean),
          getChannel: state => id => state.channelsMap[id],
        },
      },
      channelList: {
        namespaced: true,
        state: {
          page: {
            count: CHANNEL_IDS.length,
            results: CHANNEL_IDS,
          },
        },
        actions: {
          searchCatalog: mockSearchCatalog,
        },
      },
    },
  });
}

const store = createStore();

function renderComponent({ storeOverrides } = {}) {
  return render(CatalogList, {
    store: storeOverrides || store,
    routes: router,
    stubs: { CatalogFilters: true },
  });
}

describe('CatalogList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    router.push({ name: RouteNames.CATALOG_ITEMS }).catch(() => {});
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('calls the searchCatalog action on mount', async () => {
    renderComponent();
    await waitFor(() => {
      expect(mockSearchCatalog).toHaveBeenCalled();
    });
  });

  it('shows results found', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/results found/i)).toBeInTheDocument();
    });
  });

  it('shows the selection link', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Download a summary of selected channels')).toBeInTheDocument();
    });
  });

  it('shows the visually hidden title and all channel cards in correct semantic structure', async () => {
    renderComponent();

    const title = await screen.findByRole('heading', { name: /content library/i });
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

  it('navigates to channel via window.location when logged in and card is clicked', async () => {
    delete window.location;
    window.location = { ...originalLocation, href: '' };

    renderComponent({ storeOverrides: createStore({ loggedIn: true }) });
    const cards = await screen.findAllByTestId('channel-card');
    await userEvent.click(cards[0]);

    expect(window.location.href).toBe('channel');
  });

  it('navigates to channel details via router when not logged in and card is clicked', async () => {
    renderComponent({ storeOverrides: createStore({ loggedIn: false }) });
    const cards = await screen.findAllByTestId('channel-card');
    await userEvent.click(cards[0]);

    await waitFor(() => {
      expect(router.currentRoute.name).toBe(RouteNames.CHANNEL_DETAILS);
      expect(router.currentRoute.params.channelId).toBe('channel-1');
    });
  });

  describe('selection', () => {
    it('hides checkboxes and selection text initially', async () => {
      renderComponent();
      await waitFor(() => screen.getByText('Download a summary of selected channels'));

      expect(screen.queryByRole('checkbox', { name: /select all/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/channels selected/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('shows checkboxes, selection text, and cancel button when selecting', async () => {
      const user = userEvent.setup();
      renderComponent();

      const selectButton = await waitFor(() =>
        screen.getByText('Download a summary of selected channels'),
      );
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.queryByRole('checkbox', { name: /select all/i })).toBeInTheDocument();
        expect(screen.queryByText(/channels selected/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it('exits selection when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const selectButton = await waitFor(() =>
        screen.getByText('Download a summary of selected channels'),
      );
      await user.click(selectButton);
      const cancelButton = await waitFor(() => screen.getByRole('button', { name: /cancel/i }));

      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('checkbox', { name: /select all/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/channels selected/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('search', () => {
    it('calls the searchCatalog action when query parameters change', async () => {
      renderComponent();

      await waitFor(() => screen.getByText(/results found/i));

      const initialCalls = mockSearchCatalog.mock.calls.length;

      await router.push({
        name: RouteNames.CATALOG_ITEMS,
        query: { keywords: 'search test' },
      });

      await waitFor(() => {
        expect(mockSearchCatalog.mock.calls.length).toBeGreaterThan(initialCalls);
      });
    });
  });
});
