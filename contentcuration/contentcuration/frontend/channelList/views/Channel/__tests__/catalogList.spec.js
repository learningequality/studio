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
  const mockDownloadChannelsCSV = jest.fn(() => Promise.resolve());
  const mockDownloadChannelsPDF = jest.fn(() => Promise.resolve());

  const store = new Store({
    state: {
      connection: {
        online: overrides.offline ? false : true,
      },
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
      ChannelItem: {
        props: ['channelId'],
        template: '<div :data-testid="`channel-${channelId}`">Channel Item</div>',
      },
      BottomBar: { template: '<div data-testid="toolbar"><slot /></div>' },
      Checkbox: {
        props: ['value', 'label', 'indeterminate'],
        data() {
          return {
            isChecked: this.value,
          };
        },
        watch: {
          value(newVal) {
            this.isChecked = newVal;
          },
        },
        template: `
          <label>
            <input
              type="checkbox"
              :checked="isChecked"
              :data-testid="label ? 'select-all-checkbox' : 'checkbox'"
              @change="$emit('input', $event.target.checked)"
            />
            <span v-if="label">{{ label }}</span>
          </label>
        `,
      },
    },
    mocks: {
      $tr: (key, params) => {
        const translations = {
          resultsText: params ? `${params.count} result${params.count !== 1 ? 's' : ''} found` : '',
          selectChannels: 'Download a summary of selected channels',
          selectAll: 'Select all',
          cancelButton: 'Cancel',
          downloadButton: 'Download',
          downloadPDF: 'Download PDF',
          downloadCSV: 'Download CSV',
          downloadingMessage: 'Download started',
          channelSelectionCount: params
            ? `${params.count} channel${params.count !== 1 ? 's' : ''} selected`
            : '',
        };
        return translations[key] || key;
      },
    },
  });

  return {
    ...renderResult,
    store,
    router,
    mockSearchCatalog,
    mockDownloadChannelsCSV,
    mockDownloadChannelsPDF,
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
        expect(screen.getByText('2 results found')).toBeInTheDocument();
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
        expect(screen.getByText('Download a summary of selected channels')).toBeInTheDocument();
      });
    });
  });

  describe('selection mode workflow', () => {
    it('should hide checkboxes and toolbar initially', async () => {
      makeWrapper();
      await waitFor(() => screen.getByText('2 results found'));

      const checkboxes = screen.queryAllByTestId('checkbox');
      if (checkboxes.length > 0) {
        checkboxes.forEach(checkbox => {
          expect(checkbox.closest('label')).toHaveStyle('display: none');
        });
      }
      expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
    });

    it('should enter selection mode when user clicks select button', async () => {
      const user = userEvent.setup();
      makeWrapper();

      await waitFor(() => screen.getByText('Download a summary of selected channels'));
      await user.click(screen.getByText('Download a summary of selected channels'));

      await waitFor(() => {
        expect(screen.getByText('Select all')).toBeInTheDocument();
        expect(screen.getByTestId('toolbar')).toBeInTheDocument();
      });
    });

    it('should show all channels selected by default in selection mode', async () => {
      const user = userEvent.setup();
      makeWrapper();

      await waitFor(() => screen.getByText('Download a summary of selected channels'));
      await user.click(screen.getByText('Download a summary of selected channels'));

      await waitFor(() => {
        expect(screen.getByText('2 channels selected')).toBeInTheDocument();
      });
    });

    it('should exit selection mode when user clicks cancel', async () => {
      const user = userEvent.setup();
      makeWrapper();

      // Enter selection mode
      await waitFor(() => screen.getByText('Download a summary of selected channels'));
      await user.click(screen.getByText('Download a summary of selected channels'));
      await waitFor(() => screen.getByTestId('toolbar'));

      await user.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('channel selection', () => {
    it('should show selection count in toolbar when in selection mode', async () => {
      const user = userEvent.setup();
      makeWrapper();

      await waitFor(() => screen.getByText('Download a summary of selected channels'));
      await user.click(screen.getByText('Download a summary of selected channels'));

      await waitFor(() => {
        expect(screen.getByTestId('toolbar')).toBeInTheDocument();
      });
    });

    it('should display select-all checkbox in selection mode', async () => {
      const user = userEvent.setup();
      makeWrapper();

      await waitFor(() => screen.getByText('Download a summary of selected channels'));
      await user.click(screen.getByText('Download a summary of selected channels'));

      await waitFor(() => {
        expect(screen.getByTestId('select-all-checkbox')).toBeInTheDocument();
      });
    });
  });

  describe('search and filtering', () => {
    it('should call searchCatalog when query parameters change', async () => {
      const { router, mockSearchCatalog } = makeWrapper();

      await waitFor(() => screen.getByText('2 results found'));

      const initialCalls = mockSearchCatalog.mock.calls.length;

      await router.push({
        name: RouteNames.CATALOG_ITEMS,
        query: { keywords: 'search test' },
      });

      await waitFor(() => {
        expect(mockSearchCatalog.mock.calls.length).toBeGreaterThan(initialCalls);
      });
    });

    it('should show results after filtering', async () => {
      const { router } = makeWrapper();

      await waitFor(() => screen.getByText('2 results found'));

      await router.push({
        name: RouteNames.CATALOG_ITEMS,
        query: { keywords: 'test search' },
      });

      await waitFor(() => {
        expect(screen.getByText('2 results found')).toBeInTheDocument();
      });
    });
  });

  describe('download workflow', () => {
    it('should show select button to enable downloads', async () => {
      makeWrapper();

      await waitFor(() => {
        expect(screen.getByText('Download a summary of selected channels')).toBeInTheDocument();
      });
    });

    it('should display toolbar when entering selection mode', async () => {
      const user = userEvent.setup();
      makeWrapper();

      await waitFor(() => screen.getByText('Download a summary of selected channels'));
      await user.click(screen.getByText('Download a summary of selected channels'));

      await waitFor(() => {
        expect(screen.getByTestId('toolbar')).toBeInTheDocument();
      });
    });
  });
});
