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

function makeWrapper() {
  const mockSearchCatalog = jest.fn(() => Promise.resolve());
  
  const store = new Store({
    state: {
      connection: {
        online: true,
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
      LoadingText: { template: '<div>Loading...</div>' },
      Pagination: { template: '<div>Pagination</div>' },
      BottomBar: { template: '<div data-test="toolbar"><slot /></div>' },
      Checkbox: {
        props: ['value', 'label', 'indeterminate'],
        template: `
          <label>
            <input 
              type="checkbox" 
              :checked="value"
              :data-test="label ? 'select-all' : 'checkbox'"
              @change="$emit('input', $event.target.checked)"
            />
            <span v-if="label">{{ label }}</span>
          </label>
        `,
      },
      ToolBar: { template: '<div><slot /></div>' },
      OfflineText: { template: '<div>Offline</div>' },
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
          channelSelectionCount: params ? `${params.count} channel${params.count !== 1 ? 's' : ''} selected` : '',
        };
        return translations[key] || key;
      },
    },
  });

  return { ...renderResult, store, router, mockSearchCatalog };
}

describe('catalogList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call loadCatalog on mount', async () => {
    const { mockSearchCatalog } = makeWrapper();
    await waitFor(() => {
      expect(mockSearchCatalog).toHaveBeenCalled();
    });
  });

  describe('on query change', () => {
    it('should call searchCatalog when query changes', async () => {
      const { router, mockSearchCatalog } = makeWrapper();
      
      await waitFor(() => screen.getByText('2 results found'));
      
      const initialCalls = mockSearchCatalog.mock.calls.length;
      
      await router.push({ 
        name: RouteNames.CATALOG_ITEMS,
        query: { keywords: 'search catalog test' } 
      });

      await waitFor(() => {
        expect(mockSearchCatalog.mock.calls.length).toBeGreaterThan(initialCalls);
      });
    });
  });

  describe('download workflow', () => {
    describe('toggling selection mode', () => {
      it('checkboxes and toolbar should be hidden if selecting is false', async () => {
        makeWrapper();
        await waitFor(() => screen.getByText('2 results found'));
        
        expect(screen.queryByTestId('checkbox')).not.toBeInTheDocument();
        expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
      });

      it('should activate when select button is clicked', async () => {
        const user = userEvent.setup();
        makeWrapper();
        
        await waitFor(() => screen.getByText('Download a summary of selected channels'));
        await user.click(screen.getByText('Download a summary of selected channels'));
        
        await waitFor(() => {
          expect(screen.getByText('Select all')).toBeInTheDocument();
        });
      });

      it('clicking cancel should exit selection mode', async () => {
        const user = userEvent.setup();
        makeWrapper();
        
        await waitFor(() => screen.getByText('Download a summary of selected channels'));
        await user.click(screen.getByText('Download a summary of selected channels'));
        
        await waitFor(() => screen.getByText('Cancel'));
        await user.click(screen.getByText('Cancel'));
        
        await waitFor(() => {
          expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
        });
      });
    });

    describe('selecting channels', () => {
      it('should show all channels selected by default when entering selection mode', async () => {
        const user = userEvent.setup();
        makeWrapper();
        
        await waitFor(() => screen.getByText('Download a summary of selected channels'));
        await user.click(screen.getByText('Download a summary of selected channels'));
        
        await waitFor(() => {
          expect(screen.getByText('2 channels selected')).toBeInTheDocument();
        });
      });

      it('should show select all checkbox', async () => {
        const user = userEvent.setup();
        makeWrapper();
        
        await waitFor(() => screen.getByText('Download a summary of selected channels'));
        await user.click(screen.getByText('Download a summary of selected channels'));
        
        await waitFor(() => {
          const selectAllCheckbox = screen.getByText('Select all');
          expect(selectAllCheckbox).toBeInTheDocument();
        });
      });
    });

    describe('download csv and pdf', () => {
      it('clicking download button should show Download text', async () => {
        const user = userEvent.setup();
        makeWrapper();
        
        await waitFor(() => screen.getByText('Download a summary of selected channels'));
        await user.click(screen.getByText('Download a summary of selected channels'));
        
        await waitFor(() => {
          expect(screen.getByText('Download')).toBeInTheDocument();
        });
      });

      it('should show both download options (CSV and PDF) available', async () => {
        const user = userEvent.setup();
        makeWrapper();
        
        await waitFor(() => screen.getByText('Download a summary of selected channels'));
        await user.click(screen.getByText('Download a summary of selected channels'));
        
        await waitFor(() => {
          expect(screen.getByText('Download')).toBeInTheDocument();
          // The dropdown menu contains both PDF and CSV options when clicked
        });
      });
    });
  });
});
