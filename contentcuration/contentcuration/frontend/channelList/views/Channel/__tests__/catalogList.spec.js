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
  },
  {
    id: 'channel-2',
    name: 'Channel 2',
    description: 'Test channel 2',
    language: 'en',
  },
];

const results = ['channel-1', 'channel-2'];

function makeWrapper(overrides = {}) {
  const mockSearchCatalog = jest.fn(() => Promise.resolve());

  const store = new Store({
    state: {
      connection: {
        online: overrides.offline ? false : true,
      },
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
          channelsMap: {
            'channel-1': mockChannels[0],
            'channel-2': mockChannels[1],
          },
        },
        getters: {
          getChannels: state => ids => {
            return ids.map(id => state.channelsMap[id]).filter(Boolean);
          },
          getChannel: state => id => state.channelsMap[id],
        },
        actions: {
          getChannelListDetails: jest.fn(() => Promise.resolve(mockChannels)),
        },
      },
      channelList: {
        namespaced: true,
        state: {
          page: {
            count: results.length,
            results,
            page_number: 1,
            total_pages: 1,
            next: null,
            previous: null,
            ...overrides.page,
          },
        },
        actions: {
          searchCatalog: mockSearchCatalog,
        },
      },
    },
  });

  const router = new VueRouter({
    routes: [
      {
        name: RouteNames.CATALOG_ITEMS,
        path: '/catalog',
      },
      {
        name: RouteNames.CATALOG_DETAILS,
        path: '/catalog/:channelId',
      },
    ],
  });

  router.push({ name: RouteNames.CATALOG_ITEMS }).catch(() => {});

  const renderResult = render(CatalogList, {
    localVue,
    store,
    router,
    stubs: {
      CatalogFilters: true,
    },
  });

  return {
    ...renderResult,
    store,
    router,
    mockSearchCatalog,
  };
}

describe('CatalogList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial load', () => {
    it('should render catalog results on mount', async () => {
      makeWrapper();
      await waitFor(() => {
        // Component renders actual translation - use regex for flexibility
        expect(screen.getByText(/results found/i)).toBeInTheDocument();
      });
    });

    it('should call searchCatalog on mount', async () => {
      const { mockSearchCatalog } = makeWrapper();
      await waitFor(() => {
        expect(mockSearchCatalog).toHaveBeenCalled();
      });
    });

    it('should display download button when results are available', async () => {
      makeWrapper();
      await waitFor(() => {
        expect(screen.getByTestId('select')).toBeInTheDocument();
      });
    });
  });

  describe('selection mode workflow', () => {
    it('should hide checkboxes and toolbar initially', async () => {
      makeWrapper();
      await waitFor(() => screen.getByTestId('select'));

      // Toolbar should not be visible initially (appears only in selection mode)
      expect(screen.queryByTestId('select-all')).not.toBeInTheDocument();
      expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
    });

    it('should enter selection mode and show toolbar when user clicks select button', async () => {
      const user = userEvent.setup();
      makeWrapper();

      await waitFor(() => screen.getByTestId('select'));
      await user.click(screen.getByTestId('select'));

      await waitFor(() => {
        expect(screen.getByTestId('select-all')).toBeInTheDocument();
        expect(screen.getByTestId('cancel')).toBeInTheDocument();
        expect(screen.getByText(/channels selected/i)).toBeInTheDocument();
      });
    });

    it('should exit selection mode when user clicks cancel', async () => {
      const user = userEvent.setup();
      makeWrapper();

      await waitFor(() => screen.getByTestId('select'));
      await user.click(screen.getByTestId('select'));
      await waitFor(() => screen.getByTestId('cancel'));

      await user.click(screen.getByTestId('cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('cancel')).not.toBeInTheDocument();
        expect(screen.queryByTestId('select-all')).not.toBeInTheDocument();
      });
    });
  });

  describe('channel selection', () => {
    it('should display select-all checkbox in selection mode', async () => {
      const user = userEvent.setup();
      makeWrapper();

      await waitFor(() => screen.getByTestId('select'));
      await user.click(screen.getByTestId('select'));

      await waitFor(() => {
        expect(screen.getByTestId('select-all')).toBeInTheDocument();
        expect(screen.getByText(/channels selected/i)).toBeInTheDocument();
      });
    });
  });

  describe('search and filtering', () => {
    it('should call searchCatalog when query parameters change', async () => {
      const { router, mockSearchCatalog } = makeWrapper();

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

    it('should maintain results display after filtering', async () => {
      const { router } = makeWrapper();

      await waitFor(() => screen.getByText(/results found/i));

      await router.push({
        name: RouteNames.CATALOG_ITEMS,
        query: { keywords: 'test search' },
      });

      await waitFor(() => {
        expect(screen.getByText(/results found/i)).toBeInTheDocument();
      });
    });
  });

  describe('download workflow', () => {
    it('should show select button to enable downloads', async () => {
      makeWrapper();

      await waitFor(() => {
        expect(screen.getByTestId('select')).toBeInTheDocument();
      });
    });
  });
});
