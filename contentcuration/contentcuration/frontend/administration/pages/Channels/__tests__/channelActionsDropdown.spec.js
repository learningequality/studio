import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import ChannelActionsDropdown from '../ChannelActionsDropdown';

const localVue = createLocalVue();
localVue.use(Vuex);

const channelId = '11111111111111111111111111111111';
const channel = {
  id: channelId,
  name: 'Channel Test',
  created: new Date(),
  modified: new Date(),
  public: true,
  published: true,
  primary_token: 'testytesty',
  deleted: false,
  demo_server_url: 'demo.com',
  source_url: 'source.com',
};

jest.mock('shared/views/channel/mixins', () => ({
  channelExportMixin: {
    methods: {
      generateChannelsPDF: jest.fn().mockResolvedValue(),
      generateChannelsCSV: jest.fn().mockResolvedValue(),
    },
  },
}));

const mockActions = {
  updateChannel: jest.fn(() => Promise.resolve()),
  deleteChannel: jest.fn(() => Promise.resolve()),
  getAdminChannelListDetails: jest.fn(() => Promise.resolve([channel])),
  showSnackbarSimple: jest.fn(() => Promise.resolve()),
};

const createMockStore = (channelProps = {}) => {
  const mergedChannel = { ...channel, ...channelProps };

  return new Vuex.Store({
    modules: {
      channel: {
        namespaced: true,
        state: {
          channelsMap: { [channelId]: mergedChannel },
        },
        getters: {
          getChannel: state => id => state.channelsMap[id],
        },
      },
      channelAdmin: {
        namespaced: true,
        actions: {
          updateChannel: mockActions.updateChannel,
          deleteChannel: mockActions.deleteChannel,
          getAdminChannelListDetails: mockActions.getAdminChannelListDetails,
        },
      },
    },
    actions: {
      showSnackbarSimple: mockActions.showSnackbarSimple,
    },
  });
};

const renderComponent = (props = {}) => {
  const store = createMockStore(props.channelProps);

  return render(ChannelActionsDropdown, {
    localVue,
    store,
    props: { channelId },
    routes: new VueRouter(),
  });
};

describe('channelActionsDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('restore channel dialog', () => {
    it('should open confirmation modal, call updateChannel action, and show snackbar when confirmed', async () => {
      const dialogMessage = `Are you sure you want to restore Channel Test and make it active again?`;
      const user = userEvent.setup();

      renderComponent({ channelProps: { deleted: true } });

      expect(screen.queryByText(dialogMessage)).not.toBeInTheDocument();

      await user.click(screen.getByText('Restore'));

      expect(screen.getByText(dialogMessage)).toBeInTheDocument();
      expect(screen.getByText('Restore channel')).toBeVisible();

      const confirmButton = screen.getByRole('button', { name: 'Restore' });
      await user.click(confirmButton);

      expect(mockActions.updateChannel).toHaveBeenCalledWith(expect.any(Object), {
        id: channelId,
        deleted: false,
      });
      expect(mockActions.showSnackbarSimple.mock.calls[0][1]).toBe('Channel restored');
    });

    it('should close the dialog when confirm button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ channelProps: { deleted: true } });

      await user.click(screen.getByText('Restore'));
      const confirmButton = screen.getByRole('button', { name: 'Restore' });
      await user.click(confirmButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('delete permanently dialog', () => {
    it('should open confirmation modal, call deleteChannel action, and show snackbar when confirmed', async () => {
      const dialogMessage = `Are you sure you want to permanently delete Channel Test? This can not be undone.`;
      const user = userEvent.setup();

      renderComponent({ channelProps: { deleted: true } });

      expect(screen.queryByText(dialogMessage)).not.toBeInTheDocument();

      await user.click(screen.getByText('Delete permanently'));

      expect(screen.getByText(dialogMessage)).toBeInTheDocument();
      expect(screen.getByText('Permanently delete channel')).toBeVisible();

      const confirmButton = screen.getByRole('button', { name: 'Delete permanently' });
      await user.click(confirmButton);

      expect(mockActions.deleteChannel).toHaveBeenCalledWith(expect.any(Object), channelId);
      expect(mockActions.showSnackbarSimple.mock.calls[0][1]).toBe('Channel deleted permanently');
    });

    it('should close the dialog when confirm button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ channelProps: { deleted: true } });

      await user.click(screen.getByText('Delete permanently'));
      const confirmButton = screen.getByRole('button', { name: 'Delete permanently' });
      await user.click(confirmButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('make public dialog', () => {
    it('should open confirmation modal, call updateChannel action, and show snackbar when confirmed', async () => {
      const dialogMessage = `All users will be able to view and import content from Channel Test.`;
      const user = userEvent.setup();

      renderComponent({ channelProps: { public: false, deleted: false } });

      expect(screen.queryByText(dialogMessage)).not.toBeInTheDocument();

      await user.click(screen.getByText('Make public'));

      expect(screen.getByText(dialogMessage)).toBeInTheDocument();
      expect(screen.getByText('Make channel public')).toBeVisible();

      const confirmButton = screen.getByRole('button', { name: 'Make public' });
      await user.click(confirmButton);

      expect(mockActions.updateChannel).toHaveBeenCalledWith(expect.any(Object), {
        id: channelId,
        isPublic: true,
      });
      expect(mockActions.showSnackbarSimple.mock.calls[0][1]).toBe('Channel changed to public');
    });

    it('should close the dialog when confirm button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ channelProps: { public: false, deleted: false } });

      await user.click(screen.getByText('Make public'));
      const confirmButton = screen.getByRole('button', { name: 'Make public' });
      await user.click(confirmButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('delete channel dialog', () => {
    it('should open confirmation modal, call updateChannel action, and show snackbar when confirmed', async () => {
      const dialogMessage = `Are you sure you want to delete Channel Test?`;
      const user = userEvent.setup();

      renderComponent({ channelProps: { public: false, deleted: false } });

      expect(screen.queryByText(dialogMessage)).not.toBeInTheDocument();

      await user.click(screen.getByText('Delete channel'));

      expect(screen.getByText(dialogMessage)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Delete channel' })).toBeVisible();

      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      expect(mockActions.updateChannel).toHaveBeenCalledWith(expect.any(Object), {
        id: channelId,
        deleted: true,
      });
      expect(mockActions.showSnackbarSimple.mock.calls[0][1]).toBe('Channel deleted');
    });

    it('should close the dialog when confirm button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ channelProps: { public: false, deleted: false } });

      await user.click(screen.getByText('Delete channel'));
      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('make private dialog', () => {
    it('should open confirmation modal, call updateChannel action, and show snackbar when confirmed', async () => {
      const dialogMessage = `Only users with view-only or edit permissions will be able to access Channel Test.`;
      const user = userEvent.setup();

      renderComponent();

      expect(screen.queryByText(dialogMessage)).not.toBeInTheDocument();

      await user.click(screen.getByText('Make private'));

      expect(screen.getByText(dialogMessage)).toBeInTheDocument();
      expect(screen.getByText('Make channel private')).toBeVisible();

      const confirmButton = screen.getByRole('button', { name: 'Make private' });
      await user.click(confirmButton);

      expect(mockActions.updateChannel).toHaveBeenCalledWith(expect.any(Object), {
        id: channelId,
        isPublic: false,
      });
      expect(mockActions.showSnackbarSimple.mock.calls[0][1]).toBe('Channel changed to private');
    });

    it('should close the dialog when confirm button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('Make private'));
      const confirmButton = screen.getByRole('button', { name: 'Make private' });
      await user.click(confirmButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('menu visibility', () => {
    it('should show correct menu items for deleted channel', () => {
      renderComponent({ channelProps: { deleted: true } });
      expect(screen.getByText('Restore')).toBeVisible();
      expect(screen.getByText('Delete permanently')).toBeVisible();
      expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
      expect(screen.queryByText('Make public')).not.toBeInTheDocument();
    });

    it('should show correct menu items for live private channel', () => {
      renderComponent({ channelProps: { public: false, deleted: false } });
      expect(screen.getByText('Download PDF')).toBeVisible();
      expect(screen.getByText('Download CSV')).toBeVisible();
      expect(screen.getByText('Make public')).toBeVisible();
      expect(screen.getByText('Delete channel')).toBeVisible();
      expect(screen.queryByText('Restore')).not.toBeInTheDocument();
    });

    it('should show correct menu items for live public channel', () => {
      renderComponent({ channelProps: { public: true, deleted: false } });
      expect(screen.getByText('Download PDF')).toBeVisible();
      expect(screen.getByText('Download CSV')).toBeVisible();
      expect(screen.getByText('Make private')).toBeVisible();
      expect(screen.queryByText('Delete channel')).not.toBeInTheDocument();
      expect(screen.queryByText('Restore')).not.toBeInTheDocument();
    });
  });
});
