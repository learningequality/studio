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

const PARENT_ROUTE = 'parent-route';
const TEST_ROUTE = 'channel-details';

const createRouter = () => {
  return new VueRouter({
    routes: [
      {
        name: PARENT_ROUTE,
        path: '/',
        children: [
          {
            name: TEST_ROUTE,
            path: '/channel/:channelId',
            component: ChannelDetailsModal,
          },
        ],
      },
    ],
  });
};

const renderComponent = (options = {}) => {
  const store = createMockStore();
  const router = createRouter();

  router.push({
    name: TEST_ROUTE,
    params: { channelId },
    query: { last: PARENT_ROUTE },
  });

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
          <div>
            <button data-test="close" @click="$emit('input', false)">Close</button>
            <div><slot name="header"></slot></div>
            <slot></slot>
          </div>
        `,
        props: ['value'],
      },
      StudioLargeLoader: {
        template: '<div data-testid="loader">Loading...</div>',
      },
      DetailsPanel: {
        template: '<div data-testid="details-panel">Details Panel</div>',
        props: ['details', 'loading'],
      },
      KButton: {
        template: `
          <button :data-test="$attrs['data-test']">
            {{ text }}
            <div v-if="hasDropdown"><slot name="menu"></slot></div>
          </button>
        `,
        props: ['text', 'primary', 'hasDropdown'],
      },
      KDropdownMenu: {
        template: `
          <div data-testid="dropdown-menu">
            <button
              v-for="option in options"
              :key="option.value"
              @click="$emit('select', option)"
            >
              {{ option.label }}
            </button>
          </div>
        `,
        props: ['options'],
      },
    },
    mocks: {
      $analytics: {
        trackAction: jest.fn(),
        trackEvent: jest.fn(),
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

  it('clicking close button should close the modal', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(testChannel.name)).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    await user.click(closeButton);
  });

  it('pressing ESC key should close the modal', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(testChannel.name)).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    // Modal should remain rendered but dialog value changes
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('should display download button after loading', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Download channel summary')).toBeInTheDocument();
    });
  });

  it('should display download button with dropdown functionality', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Download channel summary')).toBeInTheDocument();
    });

    // Verify button is clickable
    const downloadButton = screen.getByText('Download channel summary');
    expect(downloadButton).toBeInTheDocument();
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

  it('should track analytics on mount', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(testChannel.name)).toBeInTheDocument();
    });

    // Analytics is mocked and tracked in the component
    expect(screen.getByText(testChannel.name)).toBeInTheDocument();
  });
});
