import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import ChannelSelectionList from '../ChannelSelectionList';
import { ChannelListTypes } from 'shared/constants';

jest.mock('kolibri-design-system/lib/composables/useKShow', () => ({
  __esModule: true,
  default: () => ({
    show: (_id, loading) => loading,
  }),
}));

const searchWord = 'search test';

const editChannel = {
  id: 'editchannel',
  name: searchWord,
  description: 'A curated collection of math resources',
  edit: true,
  published: true,
};

const editChannel2 = {
  id: 'editchannel2',
  name: 'Another Channel',
  description: 'Science and nature topics for all ages',
  edit: true,
  published: true,
};

const publicChannel = {
  id: 'publicchannel',
  name: 'Public Channel',
  public: true,
  published: true,
};

const mockActions = {
  loadChannelList: jest.fn(() => Promise.resolve()),
};

const makeStore = () =>
  new Store({
    modules: {
      channel: {
        namespaced: true,
        state: {},
        getters: {
          channels: () => [editChannel, editChannel2, publicChannel],
          getChannel: () => id => [editChannel, editChannel2, publicChannel].find(c => c.id === id),
        },
        actions: mockActions,
        mutations: {
          ADD_CHANNELS() {},
        },
      },
    },
  });

const renderComponent = (props = {}) => {
  const router = new VueRouter({
    routes: [{ path: '/', name: 'Home' }],
  });

  return render(ChannelSelectionList, {
    router,
    store: makeStore(),
    props: {
      listType: ChannelListTypes.EDITABLE,
      value: [], // Default to empty
      ...props, // Allow overriding props for specific tests
    },
  });
};

describe('ChannelSelectionList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a list of editable channels and hides non-editable ones', async () => {
    await renderComponent();

    // Specific wait avoids wrapping the whole block in waitFor
    expect(await screen.findByLabelText('Search for a channel')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: editChannel.name })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: editChannel2.name })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: publicChannel.name })).not.toBeInTheDocument();
  });

  it('shows loader while the channel list is loading', async () => {
    let resolveLoad;
    const loadingPromise = new Promise(resolve => {
      resolveLoad = resolve;
    });
    mockActions.loadChannelList.mockReturnValueOnce(loadingPromise);

    await renderComponent();

    expect(screen.getByTestId('loader')).toBeInTheDocument();

    resolveLoad();
    expect(await screen.findByLabelText('Search for a channel')).toBeInTheDocument();
  });

  it('filters the channel list when the user types in the search box', async () => {
    const user = userEvent.setup();
    await renderComponent();

    // Wait for data load
    expect(await screen.findByRole('heading', { name: editChannel.name })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: editChannel2.name })).toBeInTheDocument();

    const searchInput = screen.getByLabelText('Search for a channel');
    await user.clear(searchInput);
    await user.type(searchInput, editChannel.name);

    // Verify filter happened
    expect(await screen.findByRole('heading', { name: editChannel.name })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: editChannel2.name })).not.toBeInTheDocument();
  });

  it('selects a channel when the user clicks the checkbox', async () => {
    const user = userEvent.setup();
    const { emitted } = await renderComponent();

    await screen.findByRole('heading', { name: editChannel.name });

    // Using getByTestId because the component doesn't expose unique
    // accessible roles for individual channel checkboxes
    const checkboxRow = screen.getByTestId(`checkbox-${editChannel.id}`);

    // Find the checkbox strictly within this row
    const checkbox = within(checkboxRow).getByRole('checkbox');

    await user.click(checkbox);

    expect(emitted()).toHaveProperty('input');
    expect(emitted().input).toHaveLength(1);
    expect(emitted().input[0][0]).toEqual([editChannel.id]);
  });

  it('deselects a channel when the user clicks the checkbox of an already selected channel', async () => {
    const user = userEvent.setup();

    // Initialize with the channel already selected
    const { emitted } = await renderComponent({ value: [editChannel.id] });

    await screen.findByRole('heading', { name: editChannel.name });

    // Using getByTestId because the component doesn't expose unique
    // accessible roles for individual channel checkboxes
    const checkboxRow = screen.getByTestId(`checkbox-${editChannel.id}`);
    const checkbox = within(checkboxRow).getByRole('checkbox');

    // Click the checkbox to deselect
    await user.click(checkbox);

    expect(emitted()).toHaveProperty('input');
    expect(emitted().input).toHaveLength(1);
    expect(emitted().input[0][0]).toEqual([]);
  });

  it('selects a channel when the user clicks the channel card', async () => {
    const user = userEvent.setup();
    const { emitted } = await renderComponent();

    await screen.findByRole('heading', { name: editChannel.name });

    // Using getByTestId because the component doesn't expose accessible
    // roles for channel cards
    const card = screen.getByTestId(`channel-item-${editChannel.id}`);
    await user.click(card);

    expect(emitted()).toHaveProperty('input');
    expect(emitted().input).toHaveLength(1);
    expect(emitted().input[0][0]).toEqual([editChannel.id]);
  });

  it('deselects a channel when the user clicks a selected channel card', async () => {
    const user = userEvent.setup();

    // Initialize with the channel already selected
    const { emitted } = await renderComponent({ value: [editChannel.id] });

    await screen.findByRole('heading', { name: editChannel.name });

    // Using getByTestId because the component doesn't expose accessible
    // roles for channel cards
    const card = screen.getByTestId(`channel-item-${editChannel.id}`);
    await user.click(card);

    expect(emitted()).toHaveProperty('input');
    expect(emitted().input).toHaveLength(1);
    expect(emitted().input[0][0]).toEqual([]);
  });

  it('each checkbox has an accessible name matching its channel name', async () => {
    await renderComponent();

    // KCheckbox renders a visually-hidden <label for="id"> associated with the input,
    // so getByRole resolves the accessible name correctly for screen readers
    expect(await screen.findByRole('checkbox', { name: editChannel.name })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: editChannel2.name })).toBeInTheDocument();
  });
});
