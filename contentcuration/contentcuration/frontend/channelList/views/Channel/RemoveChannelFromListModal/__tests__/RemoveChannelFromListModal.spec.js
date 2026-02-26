import { render, screen, within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { Store } from 'vuex';
import RemoveChannelFromListModal from '../index.vue';

const mockRemoveViewer = jest.fn().mockResolvedValue();
const mockShowSnackbarSimple = jest.fn();

function createStore() {
  return new Store({
    state: {
      session: {
        currentUser: { id: 'user-id' },
      },
    },
    actions: {
      showSnackbarSimple: mockShowSnackbarSimple,
    },
    modules: {
      channel: {
        namespaced: true,
        actions: {
          removeViewer: mockRemoveViewer,
        },
      },
    },
  });
}

function renderComponent(props = {}) {
  return render(RemoveChannelFromListModal, {
    routes: [],
    store: createStore(),
    props: {
      channelId: 'channel-id',
      ...props,
    },
  });
}

describe('RemoveChannelFromListModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct title and description', () => {
    renderComponent();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Remove from channel list')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'You have view-only access to this channel. Confirm that you want to remove it from your list of channels.',
      ),
    ).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('does not call the removeViewer action when cancel is clicked', async () => {
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(mockRemoveViewer).not.toHaveBeenCalled();
    });
  });

  it('emits close when cancel is clicked', async () => {
    const { emitted } = renderComponent();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(emitted()).toHaveProperty('close');
    });
  });

  it('calls the removeViewer action with correct channel and user IDs when confirmed', async () => {
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => {
      expect(mockRemoveViewer).toHaveBeenCalledWith(expect.anything(), {
        channelId: 'channel-id',
        userId: 'user-id',
      });
    });
  });

  it('calls the showSnackbarSimple action with correct text when confirmed', async () => {
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => {
      expect(mockShowSnackbarSimple).toHaveBeenCalledWith(expect.anything(), 'Channel removed');
    });
  });

  it('emits close after removal is confirmed', async () => {
    const { emitted } = renderComponent();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => {
      expect(emitted()).toHaveProperty('close');
    });
  });
});
