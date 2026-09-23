import { render, screen, waitFor } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import SearchResultsList from '../SearchResultsList';
import { RouteNames } from '../../../constants';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

window.HTMLElement.prototype.scrollIntoView = jest.fn();

const NODES = [
  { id: 'node-1', title: 'First result' },
  { id: 'node-2', title: 'Second result' },
];

async function renderComponent() {
  SearchResultsList.methods.fetchResultsDebounced.cancel();

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
  router.push({
    name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
    params: { searchTerm: 'fractions', destNodeId: 'dest-1' },
  });

  const utils = render(SearchResultsList, {
    localVue,
    store,
    router,
    props: { selected: [] },
    stubs: {
      SearchFilters: true,
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
  it('focuses the first result after the initial search, then leaves focus alone on a filter-only change', async () => {
    const { router } = await renderComponent();

    await waitFor(
      () => {
        expect(screen.getAllByRole('checkbox')[0]).toHaveFocus();
      },
      { timeout: 3000 },
    );

    const filterControl = document.createElement('button');
    document.body.appendChild(filterControl);
    filterControl.focus();
    expect(filterControl).toHaveFocus();

    await router.push({
      name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
      params: { searchTerm: 'fractions', destNodeId: 'dest-1' },
      query: { language: 'en' },
    });

    await waitFor(
      () => {
        expect(SearchResultsList.methods.fetchResourceSearchResults).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 },
    );

    expect(filterControl).toHaveFocus();

    document.body.removeChild(filterControl);
  });
});
