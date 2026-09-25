import { render, screen, waitFor } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import SearchResultsList from '../SearchResultsList';
import { RouteNames } from '../../../constants';

jest.mock('lodash/debounce', () => fn => {
  function debounced(...args) {
    return fn.apply(this, args);
  }
  debounced.cancel = jest.fn();
  return debounced;
});

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const NODES = [
  { id: 'node-1', title: 'First result' },
  { id: 'node-2', title: 'Second result' },
];

async function renderComponent() {
  jest.restoreAllMocks();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();

  jest.spyOn(SearchResultsList.methods, 'fetchResourceSearchResults').mockResolvedValue({
    results: NODES,
    total_pages: 1,
    count: NODES.length,
  });
  jest.spyOn(SearchResultsList.methods, 'loadSavedSearches').mockResolvedValue();
  jest.spyOn(SearchResultsList.methods, 'createSearch').mockResolvedValue();

  const store = new Vuex.Store({
    modules: {
      contentNode: {
        namespaced: true,
        getters: {
          getContentNodes: () => ids => ids.map(id => NODES.find(n => n.id === id)),
        },
      },
      importFromChannels: {
        namespaced: true,
        getters: {
          getSavedSearch: () => () => null,
        },
      },
      currentChannel: {
        namespaced: true,
        state: { currentChannelId: 'channel-1' },
      },
    },
  });

  const router = new VueRouter({
    routes: [
      {
        name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
        path: '/search/:searchTerm/:destNodeId',
      },
    ],
  });
  await router.push({
    name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
    params: { searchTerm: 'fractions', destNodeId: 'dest-1' },
  });

  const utils = render(SearchResultsList, {
    localVue,
    store,
    router,
    props: { selected: [] },
    stubs: {
      SearchFilters: { template: '<button>Filter</button>' },
      SearchFilterBar: true,
      BrowsingCard: true,
      Pagination: true,
    },
  });

  await waitFor(() => {
    expect(screen.getAllByRole('checkbox')).toHaveLength(NODES.length);
  });

  return { ...utils, router };
}

describe('SearchResultsList', () => {
  it('focuses the first result after the initial search', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')[0]).toHaveFocus();
    });
  });

  it('refocuses the first result after a page query change', async () => {
    const { router } = await renderComponent();

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')[0]).toHaveFocus();
    });

    document.body.focus();

    await router.push({
      name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
      params: { searchTerm: 'fractions', destNodeId: 'dest-1' },
      query: { page: '2' },
    });

    await waitFor(() => {
      expect(SearchResultsList.methods.fetchResourceSearchResults).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')[0]).toHaveFocus();
    });
  });

  it('does not steal focus from the filters panel when only a filter changes', async () => {
    const { router } = await renderComponent();

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')[0]).toHaveFocus();
    });

    const filterControl = screen.getByRole('button', { name: 'Filter' });
    filterControl.focus();
    expect(filterControl).toHaveFocus();

    await router.push({
      name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
      params: { searchTerm: 'fractions', destNodeId: 'dest-1' },
      query: { language: 'en' },
    });

    await waitFor(() => {
      expect(SearchResultsList.methods.fetchResourceSearchResults).toHaveBeenCalledTimes(2);
    });

    expect(filterControl).toHaveFocus();
  });
});
