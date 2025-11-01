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
      generateChannelsPDF: jest.fn(() => Promise.resolve()),
      generateChannelsCSV: jest.fn(() => Promise.resolve()),
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

const createMockRouter = () => {
  return new VueRouter({
    routes: [
      {
        name: 'USERS',
        path: '/users',
      },
    ],
  });
};

const renderComponent = (props = {}) => {
  const store = createMockStore(props.channelProps);
  const router = createMockRouter();

  return render(ChannelActionsDropdown, {
    localVue,
    store,
    props: { channelId },
    routes: router,
  });
};
describe('channelActionsDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('restore channel dialog', () => {
    it('should open confirmation modal and call updateChannel action when confirmed', async () => {
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
    it('should open confirmation modal and call deleteChannel action when confirmed', async () => {
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
    it('should open confirmation modal and call updateChannel action when confirmed', async () => {
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
    it('should open confirmation modal and call updateChannel action when confirmed', async () => {
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
    it('should open confirmation modal and call updateChannel action when confirmed', async () => {
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

  describe('download functionality', () => {
    it('should call getAdminChannelListDetails when Download PDF is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ channelProps: { public: false, deleted: false } });

      await user.click(screen.getByText('Download PDF'));

      expect(mockActions.getAdminChannelListDetails).toHaveBeenCalledWith(expect.any(Object), [
        channelId,
      ]);
    });

    it('should call getAdminChannelListDetails when Download CSV is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ channelProps: { public: false, deleted: false } });

      await user.click(screen.getByText('Download CSV'));

      expect(mockActions.getAdminChannelListDetails).toHaveBeenCalledWith(expect.any(Object), [
        channelId,
      ]);
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
