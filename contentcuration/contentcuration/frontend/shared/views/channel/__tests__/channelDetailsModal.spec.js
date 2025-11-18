import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import ChannelDetailsModal from '../ChannelDetailsModal.vue';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const channelId = '11111111111111111111111111111111';
const testChannel = {
  id: channelId,
  name: 'Test Channel',
  description: 'Test Description',
};

const testDetails = {
  count: 10,
  size: 1024,
};

const mockActions = {
  loadChannel: jest.fn(() => Promise.resolve(testChannel)),
  loadChannelDetails: jest.fn(() => Promise.resolve(testDetails)),
};

const createMockStore = () => {
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
          channelsMap: {
            [channelId]: testChannel,
          },
        },
        getters: {
          getChannel: state => id => state.channelsMap[id],
        },
        actions: mockActions,
      },
    },
  });
};

const createRouter = () => {
  return new VueRouter({
    routes: [
      {
        path: '/',
        children: [
          {
            path: '/channel/:channelId',
          },
        ],
      },
    ],
  });
};

const renderComponent = (options = {}) => {
  const store = createMockStore();
  const router = createRouter();

  return render(ChannelDetailsModal, {
    localVue,
    store,
    router,
    props: {
      channelId,
    },
    stubs: {
      StudioImmersiveModal: {
        template: `
          <div v-if="value" data-testid="modal-wrapper">
            <button data-test="close" @click="$emit('input', false)">Close</button>
            <div><slot name="header"></slot></div>
            <slot></slot>
          </div>
        `,
        props: ['value'],
      },
    },
    ...options,
  });
};

describe('ChannelDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display loading indicator initially', () => {
    renderComponent();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('should display channel name in header', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(testChannel.name)).toBeInTheDocument();
    });
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(testChannel.name)).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('modal-wrapper')).not.toBeInTheDocument();
    });
  });

  it('should close modal when ESC key is pressed', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('modal-wrapper')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByTestId('modal-wrapper')).not.toBeInTheDocument();
    });
  });

  it('should display download button after loading', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Download channel summary')).toBeInTheDocument();
    });
  });

  it('should display details panel after loading', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('details-panel')).toBeInTheDocument();
    });
  });

  it('should call loadChannel and loadChannelDetails on mount', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockActions.loadChannel).toHaveBeenCalledWith(expect.any(Object), channelId);
      expect(mockActions.loadChannelDetails).toHaveBeenCalledWith(expect.any(Object), channelId);
    });
  });
});
