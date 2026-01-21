import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import CatalogList from '../CatalogList';
import { RouteNames } from '../../../constants';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const mockChannels = [
  {
    id: 'channel-1',
    name: 'Channel 1',
    description: 'Test channel 1',
    language: 'en',
    modified: new Date('2024-01-15'),
    last_published: new Date('2024-01-10'),
  },
  {
    id: 'channel-2',
    name: 'Channel 2',
    description: 'Test channel 2',
    language: 'en',
    modified: new Date('2024-01-20'),
    last_published: new Date('2024-01-18'),
  },
];

const mockChannelIds = mockChannels.map(c => c.id);

function createMockStore() {
  const mockSearchCatalog = jest.fn(() => Promise.resolve());

  return {
    store: new Store({
      state: {
        connection: { online: true },
      },
      getters: {
        loggedIn: () => true,
      },
      actions: {
        showSnackbar: jest.fn(),
      },
      modules: {
        channel: {
          namespaced: true,
          state: {
            channelsMap: Object.fromEntries(mockChannels.map(c => [c.id, c])),
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
              count: mockChannelIds.length,
              results: mockChannelIds,
            },
          },
          actions: {
            searchCatalog: mockSearchCatalog,
          },
        },
      },
    }),
    mockSearchCatalog,
  };
}

function createMockRouter() {
  const router = new VueRouter({
    routes: [
      { name: RouteNames.CATALOG_ITEMS, path: '/catalog' },
      { name: RouteNames.CATALOG_DETAILS, path: '/catalog/:channelId' },
    ],
  });
  router.push({ name: RouteNames.CATALOG_ITEMS }).catch(() => {});
  return router;
}

function renderComponent() {
  const { store, mockSearchCatalog } = createMockStore();
  const router = createMockRouter();

  return {
    ...render(CatalogList, {
      localVue,
      store,
      router,
      stubs: { CatalogFilters: true },
    }),
    router,
    mockSearchCatalog,
  };
}

describe('CatalogList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls searchCatalog on mount', async () => {
    const { mockSearchCatalog } = renderComponent();
    await waitFor(() => {
      expect(mockSearchCatalog).toHaveBeenCalled();
    });
  });

  it('renders title', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/results found/i)).toBeInTheDocument();
    });
  });

  it('displays download button', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('select')).toBeInTheDocument();
    });
  });

  it('renders channel cards', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Channel 1')).toBeInTheDocument();
      expect(screen.getByText('Channel 2')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('hides checkboxes and selection text initially', async () => {
      renderComponent();
      await waitFor(() => screen.getByTestId('select'));

      expect(screen.queryByRole('checkbox', { name: /select all/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/channels selected/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('shows checkboxes, selection text, and cancel button when selecting', async () => {
      const user = userEvent.setup();
      renderComponent();

      const selectButton = await waitFor(() => screen.getByTestId('select'));
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

      const selectButton = await waitFor(() => screen.getByTestId('select'));
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
    it('triggers searchCatalog when query parameters change', async () => {
      const { router, mockSearchCatalog } = renderComponent();

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
