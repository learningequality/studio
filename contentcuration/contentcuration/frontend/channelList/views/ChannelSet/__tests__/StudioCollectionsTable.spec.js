import { render, screen, within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import StudioCollectionsTable from '../StudioCollectionsTable.vue';
import { RouteNames } from '../../../constants';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const mockChannelSets = [
  {
    id: 'collection-1',
    name: 'Test Collection 1',
    secret_token: 'token-123',
    channels: ['channel-1', 'channel-2'],
  },
  {
    id: 'collection-2',
    name: 'Test Collection 2',
    secret_token: null,
    channels: ['channel-3'],
  },
];

const mockActions = {
  loadChannelSetList: jest.fn(() => Promise.resolve()),
  deleteChannelSet: jest.fn(() => Promise.resolve()),
};

const createMockStore = () => {
  return new Store({
    modules: {
      channelSet: {
        namespaced: true,
        state: {},
        getters: {
          channelSets: () => mockChannelSets,
          getChannelSet: () => id => mockChannelSets.find(cs => cs.id === id),
        },
        actions: mockActions,
      },
    },
    actions: {
      showSnackbarSimple: jest.fn(),
    },
  });
};

const renderComponent = async (options = {}) => {
  const store = options.store || createMockStore();
  const router = new VueRouter({
    routes: [
      {
        name: RouteNames.CHANNEL_SETS,
        path: '/collections',
        component: StudioCollectionsTable,
      },
      {
        name: RouteNames.NEW_CHANNEL_SET,
        path: '/collections/new',
        component: { template: '<div>New Channel Set</div>' },
      },
      {
        name: RouteNames.CHANNEL_SET_DETAILS,
        path: '/collections/:channelSetId',
        component: { template: '<div>Channel Set Details</div>' },
      },
    ],
  });

  router.push({ name: RouteNames.CHANNEL_SETS });

  const result = render(StudioCollectionsTable, {
    localVue,
    store,
    router,
    ...options,
  });
  await waitFor(() => {
    expect(mockActions.loadChannelSetList).toHaveBeenCalled();
  });

  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  return { ...result, router };
};

describe('StudioCollectionsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display channel sets in table when data is loaded', async () => {
    await renderComponent();

    const table = screen.getByRole('grid');
    const rows = within(table).getAllByRole('row').slice(1);

    expect(rows).toHaveLength(2);

    const row1Cells = within(rows[0]).getAllByRole('gridcell');
    expect(row1Cells[0]).toHaveTextContent('Test Collection 1');
    expect(row1Cells[1]).toHaveTextContent('Token');
    expect(row1Cells[2]).toHaveTextContent('2');

    const row2Cells = within(rows[1]).getAllByRole('gridcell');
    expect(row2Cells[0]).toHaveTextContent('Test Collection 2');
    expect(row2Cells[1]).toHaveTextContent('Saving');
    expect(row2Cells[2]).toHaveTextContent('1');
  });

  it('should display empty message when no collections are present', async () => {
    const emptyStore = new Store({
      modules: {
        channelSet: {
          namespaced: true,
          state: {},
          getters: {
            channelSets: () => [],
            getChannelSet: () => () => null,
          },
          actions: mockActions,
        },
      },
    });

    await renderComponent({ store: emptyStore });

    expect(
      screen.getByText(
        'You can package together multiple channels to create a collection. The entire collection can then be imported to Kolibri at once by using a collection token.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Learn more about collections')).toBeInTheDocument();
  });

  it('should open info modal when "Learn about collections" link is clicked', async () => {
    const user = userEvent.setup();
    await renderComponent();

    const infoLink = screen.getByText('Learn more about collections');
    await user.click(infoLink);

    expect(screen.getByRole('heading', { name: 'About collections' })).toBeInTheDocument();

    const modal = screen.getByRole('dialog');
    expect(
      within(modal).getByText(
        'A collection contains multiple Kolibri Studio channels that can be imported at one time to Kolibri with a single collection token.',
      ),
    ).toBeInTheDocument();
  });

  it('should navigate to new channel set page when "New collection" button is clicked', async () => {
    const user = userEvent.setup();
    const { router } = await renderComponent();

    const newCollectionButton = screen.getByRole('button', { name: /new collection/i });
    await user.click(newCollectionButton);

    expect(router.currentRoute.name).toBe(RouteNames.NEW_CHANNEL_SET);
  });

  it('should navigate to edit page when edit option is selected', async () => {
    const user = userEvent.setup();
    const { router } = await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Collection 1')).toBeInTheDocument();
    });

    const optionsButtons = screen.getAllByRole('button', { name: /options/i });
    await user.click(optionsButtons[0]);

    const editOption = screen.getByText('Edit collection');
    await user.click(editOption);

    expect(router.currentRoute.name).toBe(RouteNames.CHANNEL_SET_DETAILS);
    expect(router.currentRoute.params.channelSetId).toBe('collection-1');
  });

  it('should call delete action when delete is confirmed', async () => {
    const user = userEvent.setup();
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Collection 1')).toBeInTheDocument();
    });

    const optionsButtons = screen.getAllByRole('button', { name: /options/i });
    await user.click(optionsButtons[0]);

    const deleteOption = screen.getByText('Delete collection');
    await user.click(deleteOption);

    const deleteConfirmationModal = screen.getByRole('dialog');

    expect(
      within(deleteConfirmationModal).getByRole('heading', {
        name: 'Delete collection',
      }),
    ).toBeInTheDocument();

    const deleteButton = within(deleteConfirmationModal).getByRole('button', {
      name: 'Delete collection',
    });
    await user.click(deleteButton);

    expect(mockActions.deleteChannelSet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        id: 'collection-1',
        name: 'Test Collection 1',
      }),
    );
  });
});
