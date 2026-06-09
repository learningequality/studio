import { render, screen, within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { Store } from 'vuex';
import DeleteChannelModal from '../index.vue';

const mockDeleteChannel = jest.fn().mockResolvedValue();
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
          deleteChannel: mockDeleteChannel,
        },
      },
    },
  });
}

function renderComponent(props = {}) {
  return render(DeleteChannelModal, {
    routes: [],
    store: createStore(),
    props: {
      channelId: 'channel-id',
      ...props,
    },
  });
}

describe('DeleteChannelModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct title and description', () => {
    renderComponent();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Delete this channel')).toBeInTheDocument();
    expect(
      within(dialog).getByText('This channel will be permanently deleted. This cannot be undone.'),
    ).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Delete channel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('does not call the deleteChannel action when cancel is clicked', async () => {
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(mockDeleteChannel).not.toHaveBeenCalled();
    });
  });

  it('emits close when cancel is clicked', async () => {
    const { emitted } = renderComponent();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(emitted()).toHaveProperty('close');
    });
  });

  it('calls the deleteChannel action with correct channel ID when confirmed', async () => {
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: 'Delete channel' }));
    await waitFor(() => {
      expect(mockDeleteChannel).toHaveBeenCalledWith(expect.anything(), 'channel-id');
    });
  });

  it('calls the showSnackbarSimple action with correct text when confirmed', async () => {
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: 'Delete channel' }));
    await waitFor(() => {
      expect(mockShowSnackbarSimple).toHaveBeenCalledWith(expect.anything(), 'Channel deleted');
    });
  });

  it('emits close after deletion is confirmed', async () => {
    const { emitted } = renderComponent();
    await userEvent.click(screen.getByRole('button', { name: 'Delete channel' }));
    await waitFor(() => {
      expect(emitted()).toHaveProperty('close');
    });
  });
});
