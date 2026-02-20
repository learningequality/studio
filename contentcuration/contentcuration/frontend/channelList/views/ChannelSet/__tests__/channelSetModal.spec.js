import { render, screen, waitFor } from '@testing-library/vue';
import { configure } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';

import { RouteNames } from '../../../constants';
import ChannelSetModal from '../ChannelSetModal';

jest.mock('kolibri-design-system/lib/composables/useKShow', () => ({
  __esModule: true,
  default: () => ({
    show: () => false,
  }),
}));

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const CHANNEL_1 = {
  id: 'id-channel-1',
  name: 'Channel 1',
  description: 'First channel description',
  editable: true,
  published: true,
  version: 1,
};

const CHANNEL_2 = {
  id: 'id-channel-2',
  name: 'Channel 2',
  description: 'Second channel description',
  editable: true,
  published: true,
  version: 2,
};

const CHANNEL_SET = {
  id: 'id-channel-set',
  name: 'My collection',
  channels: {
    [CHANNEL_1.id]: true,
    [CHANNEL_2.id]: true,
  },
};

const mockActions = {
  loadChannelSet: jest.fn(({ commit }, id) => {
    if (id === CHANNEL_SET.id) {
      commit('channelSet/ADD_CHANNELSET', CHANNEL_SET, { root: true });
      return Promise.resolve(CHANNEL_SET);
    }
    return Promise.resolve(null);
  }),
  loadChannelList: jest.fn(() => Promise.resolve()),
  updateChannelSet: jest.fn(() => Promise.resolve()),
  commitChannelSet: jest.fn(() => Promise.resolve({ id: 'new-collection-id' })),
  deleteChannelSet: jest.fn(() => Promise.resolve()),
  addChannels: jest.fn(() => Promise.resolve()),
  removeChannels: jest.fn(() => Promise.resolve()),
  showSnackbarSimple: jest.fn(() => Promise.resolve()),
};

const makeStore = ({
  channelSet = CHANNEL_SET,
  channels = [CHANNEL_1, CHANNEL_2],
  preloadChannelSet = true,
} = {}) => {
  const channelsMap = channels.reduce((map, channel) => {
    map[channel.id] = channel;
    return map;
  }, {});

  const channelSetsMap = preloadChannelSet && channelSet ? { [channelSet.id]: channelSet } : {};

  return new Store({
    state: {
      connection: {
        online: true,
      },
    },
    modules: {
      channel: {
        namespaced: true,
        state: {
          channelsMap,
        },
        getters: {
          channels: state => Object.values(state.channelsMap),
          getChannel: state => id => state.channelsMap[id],
        },
        actions: {
          loadChannelList: mockActions.loadChannelList,
        },
      },
      channelSet: {
        namespaced: true,
        state: {
          channelSetsMap,
        },
        getters: {
          getChannelSet: state => id => {
            const set = state.channelSetsMap[id];
            if (!set) {
              return;
            }

            return {
              ...set,
              channels: Object.keys(set.channels || {}),
            };
          },
        },
        mutations: {
          ADD_CHANNELSET(state, data) {
            state.channelSetsMap = {
              ...state.channelSetsMap,
              [data.id]: data,
            };
          },
        },
        actions: {
          loadChannelSet: mockActions.loadChannelSet,
          updateChannelSet: mockActions.updateChannelSet,
          commitChannelSet: mockActions.commitChannelSet,
          deleteChannelSet: mockActions.deleteChannelSet,
          addChannels: mockActions.addChannels,
          removeChannels: mockActions.removeChannels,
        },
      },
    },
    actions: {
      showSnackbarSimple: mockActions.showSnackbarSimple,
    },
  });
};

const makeRouter = () => {
  return new VueRouter({
    routes: [
      {
        name: RouteNames.CHANNEL_SETS,
        path: '/collections',
        component: { template: '<div>Collections</div>' },
      },
      {
        name: RouteNames.NEW_CHANNEL_SET,
        path: '/collections/new',
        component: ChannelSetModal,
        props: true,
      },
      {
        name: RouteNames.CHANNEL_SET_DETAILS,
        path: '/collections/:channelSetId',
        component: ChannelSetModal,
        props: true,
      },
    ],
  });
};

const renderComponent = async ({
  routeName = RouteNames.CHANNEL_SET_DETAILS,
  channelSetId = CHANNEL_SET.id,
  channelSet = CHANNEL_SET,
  channels = [CHANNEL_1, CHANNEL_2],
  preloadChannelSet = true,
} = {}) => {
  const store = makeStore({ channelSet, channels, preloadChannelSet });
  const router = makeRouter();

  if (routeName === RouteNames.NEW_CHANNEL_SET) {
    await router.push({ name: RouteNames.NEW_CHANNEL_SET });
  } else {
    await router.push({
      name: RouteNames.CHANNEL_SET_DETAILS,
      params: { channelSetId },
    });
  }

  const result = render(ChannelSetModal, {
    localVue,
    router,
    store,
    props: routeName === RouteNames.CHANNEL_SET_DETAILS ? { channelSetId } : {},
  });

  return { ...result, router };
};

describe('ChannelSetModal', () => {
  beforeAll(() => {
    configure({ testIdAttribute: 'data-test' });
  });

  afterAll(() => {
    configure({ testIdAttribute: 'data-testid' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows existing collection details and channel list', async () => {
    await renderComponent();

    const nameInput = await screen.findByLabelText('Collection name');

    expect(nameInput).toHaveValue('My collection');
    expect(screen.getByText('2 channels')).toBeInTheDocument();
    expect(screen.getByText(CHANNEL_1.name)).toBeInTheDocument();
    expect(screen.getByText(CHANNEL_1.description)).toBeInTheDocument();
    expect(screen.getByText(CHANNEL_2.name)).toBeInTheDocument();
    expect(screen.getByText(CHANNEL_2.description)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Select channels' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save and close' })).toBeInTheDocument();
  });

  it('loads existing collection data when opened directly on details route', async () => {
    await renderComponent({ preloadChannelSet: false });

    expect(await screen.findByDisplayValue('My collection')).toBeInTheDocument();
    expect(mockActions.loadChannelSet).toHaveBeenCalledWith(expect.any(Object), CHANNEL_SET.id);
  });

  it('lets the user move to channel selection and finish back to the collection view', async () => {
    const user = userEvent.setup();
    await renderComponent();

    await user.click(screen.getByRole('button', { name: 'Select channels' }));

    expect(await screen.findByRole('heading', { name: 'Select channels' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Finish' }));

    expect(await screen.findByRole('heading', { name: 'Collection channels' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save and close' })).toBeInTheDocument();
  });

  it('shows a validation message when user tries to create without a name', async () => {
    const user = userEvent.setup();
    const { router } = await renderComponent({
      routeName: RouteNames.NEW_CHANNEL_SET,
      preloadChannelSet: false,
      channelSet: null,
      channels: [],
    });

    expect(await screen.findByRole('button', { name: 'Create' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Field is required')).toBeInTheDocument();
    expect(router.currentRoute.name).toBe(RouteNames.NEW_CHANNEL_SET);
  });

  it('creates a new collection successfully', async () => {
    const user = userEvent.setup();
    const { router } = await renderComponent({
      routeName: RouteNames.NEW_CHANNEL_SET,
      preloadChannelSet: false,
      channelSet: null,
      channels: [],
    });
    const replaceSpy = jest.spyOn(router, 'replace');

    const nameInput = await screen.findByLabelText('Collection name');
    await user.type(nameInput, 'New collection');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockActions.commitChannelSet).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ name: 'New collection' }),
      );
      expect(replaceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { channelSetId: 'new-collection-id' },
        }),
      );
    });
  });

  it('saves valid changes and returns the user to collections', async () => {
    const user = userEvent.setup();
    const { router } = await renderComponent();

    const nameInput = await screen.findByLabelText('Collection name');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated collection name');
    await user.click(screen.getByRole('button', { name: 'Save and close' }));

    await waitFor(() => {
      expect(mockActions.updateChannelSet).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          id: CHANNEL_SET.id,
          name: 'Updated collection name',
        }),
      );
      expect(mockActions.addChannels).not.toHaveBeenCalled();
      expect(mockActions.removeChannels).not.toHaveBeenCalled();
      expect(router.currentRoute.name).toBe(RouteNames.CHANNEL_SETS);
    });
  });

  it('prompts before closing when there are unsaved changes', async () => {
    const user = userEvent.setup();
    await renderComponent();

    const nameInput = await screen.findByLabelText('Collection name');
    await user.type(nameInput, ' Updated');

    await user.click(screen.getByTestId('close'));

    expect(await screen.findByRole('heading', { name: 'Unsaved changes' })).toBeInTheDocument();
    expect(
      screen.getByText('You will lose any unsaved changes. Are you sure you want to exit?'),
    ).toBeInTheDocument();
  });

  it('closes directly when there are no unsaved changes', async () => {
    const user = userEvent.setup();
    const { router } = await renderComponent();

    await user.click(screen.getByTestId('close'));

    await waitFor(() => {
      expect(router.currentRoute.name).toBe(RouteNames.CHANNEL_SETS);
    });
  });
});
