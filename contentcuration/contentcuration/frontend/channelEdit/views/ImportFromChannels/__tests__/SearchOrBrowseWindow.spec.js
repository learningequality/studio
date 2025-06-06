import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import SearchOrBrowseWindow from '../SearchOrBrowseWindow';
import { RouteNames } from '../../../constants';
import { sendRequest } from 'shared/feedbackApiUtils';

// Mock dependencies
jest.mock('shared/feedbackApiUtils', () => ({
  RecommendationsEvent: jest.fn().mockImplementation(() => ({
    id: 'mock-event-id',
  })),
  RecommendationsInteractionEvent: jest.fn().mockImplementation(() => ({
    id: 'mock-interaction-id',
  })),
  FeedbackTypeOptions: {
    rejected: 'rejected',
  },
  sendRequest: jest.fn().mockResolvedValue({}),
}));

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

describe('SearchOrBrowseWindow', () => {
  let wrapper;
  let store;
  let router;
  let actions;
  let getters;
  let mutations;

  beforeEach(() => {
    actions = {
      showSnackbar: jest.fn(),
      'clipboard/copy': jest.fn().mockResolvedValue(),
      'contentNode/loadAncestors': jest.fn().mockResolvedValue([
        {
          id: 'parent-id',
          title: 'Parent',
          description: 'Parent desc',
          channel_id: 'channel-id',
        },
      ]),
      'contentNode/loadPublicContentNode': jest.fn().mockImplementation(({ id }) =>
        Promise.resolve({
          id,
          title: `Resource ${id}`,
          content_id: `content-${id}`,
          channel_id: 'channel-id',
        }),
      ),
      'importFromChannels/fetchRecommendations': jest.fn().mockResolvedValue([
        {
          id: 'rec-1',
          node_id: 'rec-1',
          content_id: 'content-1',
          rank: 1,
          main_tree_id: 'tree-1',
          parent_id: 'parent-1',
        },
        {
          id: 'rec-2',
          node_id: 'rec-2',
          content_id: 'content-2',
          rank: 2,
          main_tree_id: 'tree-1',
          parent_id: 'parent-1',
        },
      ]),
    };

    mutations = {
      'importFromChannels/SELECT_NODES': jest.fn(),
      'importFromChannels/DESELECT_NODES': jest.fn(),
      'importFromChannels/CLEAR_NODES': jest.fn(),
    };

    getters = {
      'currentChannel/currentChannel': () => ({ language: 'en' }),
      'importFromChannels/savedSearchesExist': () => true,
      isAIFeatureEnabled: () => true,
      'contentNode/getContentNode': () => ({ id: 'node-1' }),
    };

    store = new Store({
      modules: {
        importFromChannels: {
          namespaced: true,
          state: {
            selected: [{ id: 'selected-1' }],
          },
          actions: {
            fetchRecommendations: actions['importFromChannels/fetchRecommendations'],
          },
          mutations: {
            SELECT_NODES: mutations['importFromChannels/SELECT_NODES'],
            DESELECT_NODES: mutations['importFromChannels/DESELECT_NODES'],
            CLEAR_NODES: mutations['importFromChannels/CLEAR_NODES'],
          },
          getters: {
            savedSearchesExist: getters['importFromChannels/savedSearchesExist'],
            selected: state => state.selected, // Add selected getter
          },
        },
        contentNode: {
          namespaced: true,
          actions: {
            loadAncestors: actions['contentNode/loadAncestors'],
            loadPublicContentNode: actions['contentNode/loadPublicContentNode'],
          },
          getters: {
            getContentNode: getters['contentNode/getContentNode'],
          },
        },
        currentChannel: {
          namespaced: true,
          getters: {
            currentChannel: getters['currentChannel/currentChannel'],
          },
        },
        clipboard: {
          namespaced: true,
          actions: {
            copy: actions['clipboard/copy'],
          },
        },
        session: {
          state: {
            currentUser: { id: 'user-1' },
          },
        },
      },
      actions: {
        showSnackbar: actions.showSnackbar,
      },
      getters: {
        isAIFeatureEnabled: getters.isAIFeatureEnabled,
      },
    });

    const routes = [
      {
        path: '/import/browse/:destNodeId', // Fixed path to include param
        name: RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
      },
      {
        path: '/import/search/:searchTerm/:destNodeId', // Fixed path to include params
        name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
      },
    ];

    router = new VueRouter({ routes });
    router.push({
      name: RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
      params: { destNodeId: 'dest-1' },
    });

    wrapper = shallowMount(SearchOrBrowseWindow, {
      localVue,
      store,
      router,
      mocks: {
        $analytics: {
          trackAction: jest.fn(),
        },
        $tr: key => key,
        $computedClass: () => ({}),
      },
      stubs: {
        KModal: true,
        ImportFromChannelsModal: true,
        KGridItem: true,
        KGrid: true,
        ChannelList: true,
        ContentTreeList: true,
        SearchResultsList: true,
      },
    });
  });

  it('initializes correctly', () => {
    expect(wrapper.vm.searchTerm).toBe('');
    expect(actions['contentNode/loadAncestors']).toHaveBeenCalledWith(expect.anything(), {
      id: 'dest-1',
    });
  });

  it('validates search term correctly', async () => {
    wrapper.vm.searchTerm = '  ';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.searchIsValid).toBe(false);

    wrapper.vm.searchTerm = 'valid search';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.searchIsValid).toBe(true);
  });

  it('handles search term submission', async () => {
    wrapper.vm.searchTerm = 'new search';
    await wrapper.vm.handleSearchTerm();

    expect(mutations['importFromChannels/CLEAR_NODES']).toHaveBeenCalled();
    expect(wrapper.vm.$route.name).toBe(RouteNames.IMPORT_FROM_CHANNELS_SEARCH);
    expect(wrapper.vm.$route.params.searchTerm).toBe('new search');
  });

  it('handles selection changes', () => {
    const nodes = [{ id: 'node-1' }];
    const selected = { selected: [{ id: 'selected-1' }] };

    wrapper.vm.handleChangeSelected({ isSelected: true, nodes });
    expect(mutations['importFromChannels/SELECT_NODES']).toHaveBeenCalledWith(selected, nodes);

    wrapper.vm.handleChangeSelected({ isSelected: false, nodes });
    expect(mutations['importFromChannels/DESELECT_NODES']).toHaveBeenCalledWith(selected, nodes);
  });

  it('loads recommendations', async () => {
    await wrapper.vm.loadRecommendations(false);

    expect(actions['importFromChannels/fetchRecommendations']).toHaveBeenCalled();
    expect(wrapper.vm.recommendations.length).toBe(2);
    expect(wrapper.vm.displayedRecommendations.length).toBe(2);
  });

  it('handles view more recommendations', async () => {
    await wrapper.vm.loadRecommendations(false);
    // Set up state for viewing more
    wrapper.vm.recommendations = Array(15)
      .fill()
      .map((_, i) => ({ id: `rec-${i}` }));
    wrapper.vm.displayedRecommendations = wrapper.vm.recommendations.slice(0, 10);
    wrapper.vm.recommendationsCurrentIndex = 10;
    wrapper.vm.showViewMoreRecommendations = true;

    await wrapper.vm.handleViewMoreRecommendations();

    expect(wrapper.vm.displayedRecommendations.length).toBe(15);
  });

  it('validates feedback form correctly', () => {
    wrapper.vm.feedbackReason = ['other'];
    wrapper.vm.otherFeedback = '';

    const result = wrapper.vm.validateFeedbackForm();
    expect(result).toBe(false);
    expect(wrapper.vm.showOtherFeedbackInvalidText).toBe(true);

    wrapper.vm.otherFeedback = 'valid feedback';
    const validResult = wrapper.vm.validateFeedbackForm();
    expect(validResult).toBe(true);
    expect(wrapper.vm.showOtherFeedbackInvalidText).toBe(false);
  });

  it('submits recommendations feedback', async () => {
    await wrapper.vm.loadRecommendations(false);
    await wrapper.vm.submitRecommendationsFeedback();

    expect(sendRequest).toHaveBeenCalled();
  });

  it('handles feedback checkbox changes', () => {
    wrapper.vm.feedbackReason = [];

    wrapper.vm.handleFeedbackCheckboxChange('not_related', true);
    expect(wrapper.vm.feedbackReason).toContain('not_related');

    wrapper.vm.handleFeedbackCheckboxChange('not_related', false);
    expect(wrapper.vm.feedbackReason).not.toContain('not_related');
  });

  it('checks if feedback reason is selected', () => {
    wrapper.vm.feedbackReason = ['not_related'];

    expect(wrapper.vm.isFeedbackReasonSelected('not_related')).toBe(true);
    expect(wrapper.vm.isFeedbackReasonSelected('other')).toBe(false);
  });
});
