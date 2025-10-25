import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import ChannelSetItem from '../ChannelSetItem.vue';
import { RouteNames } from '../../../constants';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const channelSet = {
  id: 'testing',
  name: 'Test Collection',
  channels: [],
  secret_token: '1234567890',
};

const mockActions = {
  deleteChannelSet: jest.fn(() => Promise.resolve()),
};

const createMockStore = () => {
  return new Store({
    modules: {
      channelSet: {
        namespaced: true,
        state: {
          channelSetsMap: {
            [channelSet.id]: channelSet,
          },
        },
        getters: {
          getChannelSet: state => id => state.channelSetsMap[id],
        },
        actions: mockActions,
      },
    },
  });
};

const renderComponent = () => {
  const store = createMockStore();
  const router = new VueRouter({
    routes: [
      {
        name: RouteNames.CHANNEL_SET_DETAILS,
        path: '/channels/collections/:channelSetId',
      },
    ],
  });

  return render(ChannelSetItem, {
    localVue,
    store,
    router,
    props: {
      channelSetId: channelSet.id,
    },
  });
};

describe('channelSetItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clicking the edit option should navigate to channel set details', async () => {
    const user = userEvent.setup();
    renderComponent();

    const optionsButton = screen.getByRole('button', { name: /options/i });
    await user.click(optionsButton);

    const editOption = screen.getByText(/edit collection/i);
    await user.click(editOption);

    expect(editOption).toBeInTheDocument();
  });

  it('clicking delete button in dialog should delete the channel set', async () => {
    const user = userEvent.setup();
    renderComponent();

    const optionsButton = screen.getByRole('button', { name: /options/i });
    await user.click(optionsButton);

    const deleteOption = screen.getByText(/delete collection/i);
    await user.click(deleteOption);

    const modalText = /are you sure you want to delete this collection/i;
    expect(screen.getByText(modalText)).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /delete collection/i });
    await user.click(confirmButton);

    expect(mockActions.deleteChannelSet).toHaveBeenCalledWith(expect.any(Object), channelSet);
  });
});
