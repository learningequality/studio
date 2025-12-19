import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import StudioCatalogList from '../StudioCatalogList';
import { RouteNames } from '../../../constants';

const mockChannels = [
  {
    id: 'channel-1',
    name: 'Testing Channel 1',
    description: 'First test channel',
    thumbnail: null,
    thumbnail_encoding: {},
    language: 'en',
    public: false,
    version: 0,
    last_published: null,
    deleted: false,
    source_url: 'https://example.com',
    demo_server_url: 'https://demo.com',
    edit: true,
    view: true,
    modified: '2025-12-19T10:00:00Z',
    primary_token: null,
    count: 10,
    unpublished_changes: true,
    thumbnail_url: null,
    published: false,
    publishing: false,
    bookmark: false,
  },
  {
    id: 'channel-2',
    name: 'Testing Channel 2',
    description: 'Second test channel',
    thumbnail: null,
    thumbnail_encoding: {},
    language: 'es',
    public: false,
    version: 0,
    last_published: null,
    deleted: false,
    source_url: 'https://example.com',
    demo_server_url: 'https://demo.com',
    edit: true,
    view: true,
    modified: '2025-12-19T10:00:00Z',
    primary_token: null,
    count: 20,
    unpublished_changes: false,
    thumbnail_url: null,
    published: true,
    publishing: false,
    bookmark: false,
  },
];

const router = new VueRouter({
  routes: [
    { name: RouteNames.CATALOG_ITEMS, path: '/catalog' },
    { name: RouteNames.CATALOG_DETAILS, path: '/catalog/:channelId/details' },
    { name: 'CHANNEL_EDIT', path: '/:channelId/:tab' },
  ],
});

router.push({ name: RouteNames.CATALOG_ITEMS });

function renderComponent(customStore = null) {
  const searchCatalog = jest.fn().mockResolvedValue();

  const store =
    customStore ||
    new Store({
      modules: {
        channel: {
          namespaced: true,
          getters: {
            getChannels: () => ids => {
              return ids.map(id => mockChannels.find(c => c.id === id)).filter(Boolean);
            },
          },
          actions: {
            deleteChannel: jest.fn(),
            removeViewer: jest.fn(),
          },
        },
        channelList: {
          namespaced: true,
          state: {
            page: {
              count: mockChannels.length,
              results: mockChannels.map(c => c.id),
              page_number: 1,
              total_pages: 1,
            },
          },
          actions: {
            searchCatalog,
          },
        },
      },
      state: {
        connection: {
          online: true,
        },
        session: {
          currentUser: {
            id: 'user-1',
          },
        },
      },
      actions: {
        showSnackbar: jest.fn(),
        showSnackbarSimple: jest.fn(),
      },
    });

  return render(StudioCatalogList, {
    store,
    routes: router,
    stubs: {
      CatalogFilters: {
        template: '<div data-testid="catalog-filters">Filters</div>',
      },
      Pagination: {
        template: '<div data-testid="pagination">Pagination</div>',
        props: ['pageNumber', 'totalPages'],
      },
    },
  });
}

describe('StudioCatalogList', () => {
  it('renders catalog channels', async () => {
    renderComponent();
    const cards = await screen.findAllByTestId('card');
    expect(cards.length).toBe(2);
  });

  it('shows results count', async () => {
    renderComponent();
    expect(await screen.findByText(/2 results found/i)).toBeInTheDocument();
  });

  it('shows empty state when no channels found', async () => {
    const emptyStore = new Store({
      modules: {
        channel: {
          namespaced: true,
          getters: {
            getChannels: () => () => [],
          },
          actions: {
            deleteChannel: jest.fn(),
            removeViewer: jest.fn(),
          },
        },
        channelList: {
          namespaced: true,
          state: {
            page: {
              count: 0,
              results: [],
              page_number: 1,
              total_pages: 0,
            },
          },
          actions: {
            searchCatalog: jest.fn().mockResolvedValue(),
          },
        },
      },
      state: {
        connection: {
          online: true,
        },
        session: {
          currentUser: {
            id: 'user-1',
          },
        },
      },
      actions: {
        showSnackbar: jest.fn(),
        showSnackbarSimple: jest.fn(),
      },
    });

    renderComponent(emptyStore);
    const cards = screen.queryAllByTestId('card');
    expect(cards.length).toBe(0);
    expect(await screen.findByText(/0 results found/i)).toBeInTheDocument();
  });

  describe('selection mode', () => {
    it('shows select all checkbox when entering selection mode', async () => {
      renderComponent();

      // Initially no select-all checkbox
      expect(screen.queryByLabelText(/select all/i)).not.toBeInTheDocument();

      // Click select button
      const selectButton = await screen.findByText(/download a summary of selected channels/i);
      await fireEvent.click(selectButton);

      // Select-all checkbox should appear
      expect(await screen.findByLabelText(/select all/i)).toBeInTheDocument();

      // Toolbar with count should appear
      expect(await screen.findByText(/2 channels selected/i)).toBeInTheDocument();
    });

    it('exits selection mode when cancel is clicked', async () => {
      renderComponent();

      // Enter selection mode
      const selectButton = await screen.findByText(/download a summary of selected channels/i);
      await fireEvent.click(selectButton);

      // Verify we're in selection mode
      expect(await screen.findByLabelText(/select all/i)).toBeInTheDocument();

      // Click cancel
      const cancelButton = await screen.findByText(/cancel/i);
      await fireEvent.click(cancelButton);

      // Selection UI should disappear
      expect(screen.queryByLabelText(/select all/i)).not.toBeInTheDocument();
    });
  });
});
