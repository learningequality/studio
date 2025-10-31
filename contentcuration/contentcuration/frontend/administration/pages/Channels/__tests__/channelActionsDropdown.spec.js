import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import router from '../../../router';
import { factory } from '../../../store';
import ChannelActionsDropdown from '../ChannelActionsDropdown';

jest.mock('shared/views/channel/mixins', () => ({
  channelExportMixin: {
    methods: {
      generateChannelsPDF: jest.fn().mockResolvedValue(),
      generateChannelsCSV: jest.fn().mockResolvedValue(),
    },
  },
}));

const store = factory();

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

function renderComponent(channelProps = {}) {
  const mergedChannel = {
    ...channel,
    ...channelProps,
  };

  const utils = render(ChannelActionsDropdown, {
    router,
    store,
    propsData: { channelId },
    computed: {
      channel: () => mergedChannel,
    },
    mocks: {
      $store: {
        dispatch: jest.fn().mockResolvedValue(),
      },
      $tr: jest.fn(key => key),
    },
  });

  return { ...utils };
}

describe('channelActionsDropdown', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('deleted channel actions', () => {
    beforeEach(() => {
      renderComponent({ deleted: true });
    });

    it('restore channel should show restore confirmation dialog with correct context', async () => {
      const restoreButton = screen.getByText('Restore');
      await user.click(restoreButton);

      const confirmDialog = screen.getByRole('dialog');
      expect(confirmDialog).toBeVisible();
      expect(screen.getByText('Restore channel')).toBeVisible();
      expect(screen.getByText(/Are you sure you want to restore Channel Test/)).toBeVisible();
    });

    it('confirm restore channel should close the dialog', async () => {
      const restoreButton = screen.getByText('Restore');
      await user.click(restoreButton);
      const confirmButton = screen.getByRole('button', { name: 'Restore' });
      await user.click(confirmButton);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('delete channel should show permanent delete confirmation dialog with correct context', async () => {
      const deleteButton = screen.getByText('Delete permanently');
      await user.click(deleteButton);

      const confirmDialog = screen.getByRole('dialog');
      expect(confirmDialog).toBeVisible();
      expect(screen.getByText('Permanently delete channel')).toBeVisible();
      expect(
        screen.getByText(/Are you sure you want to permanently delete Channel Test\?/),
      ).toBeVisible();
    });

    it('confirm delete channel should close the dialog', async () => {
      const deleteButton = screen.getByText('Delete permanently');
      await user.click(deleteButton);
      const confirmButton = screen.getByRole('button', { name: 'Delete permanently' });
      await user.click(confirmButton);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('live channel actions', () => {
    beforeEach(() => {
      renderComponent({ public: false, deleted: false });
    });

    it('download PDF button should trigger PDF download', async () => {
      const pdfButton = screen.getByText('Download PDF');
      await user.click(pdfButton);
      expect(pdfButton).toBeVisible();
    });

    it('download CSV button should trigger CSV download', async () => {
      const csvButton = screen.getByText('Download CSV');
      await user.click(csvButton);
      expect(csvButton).toBeVisible();
    });

    it('make public button should show make public confirmation dialog with correct context', async () => {
      const makePublicButton = screen.getByText('Make public');
      await user.click(makePublicButton);

      const confirmDialog = screen.getByRole('dialog');
      expect(confirmDialog).toBeVisible();
      expect(screen.getByText('Make channel public')).toBeVisible();
      expect(
        screen.getByText(/All users will be able to view and import content from Channel Test/),
      ).toBeVisible();
    });

    it('confirm make public should close the dialog', async () => {
      const makePublicButton = screen.getByText('Make public');
      await user.click(makePublicButton);
      const confirmButton = screen.getByRole('button', { name: 'Make public' });
      await user.click(confirmButton);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('soft delete button should show soft delete confirmation dialog with correct context', async () => {
      const softDeleteButton = screen.getByText('Delete channel');
      await user.click(softDeleteButton);

      const confirmDialog = screen.getByRole('dialog');
      expect(confirmDialog).toBeVisible();
      expect(screen.getByRole('heading', { name: 'Delete channel' })).toBeVisible();
      expect(screen.getByText(/Are you sure you want to delete Channel Test\?/)).toBeVisible();
    });

    it('confirm soft delete should close the dialog', async () => {
      const softDeleteButton = screen.getByText('Delete channel');
      await user.click(softDeleteButton);
      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('public channel actions', () => {
    beforeEach(() => {
      renderComponent();
    });

    it('make private button should show make private confirmation dialog with correct context', async () => {
      const makePrivateButton = screen.getByText('Make private');
      await user.click(makePrivateButton);

      const confirmDialog = screen.getByRole('dialog');
      expect(confirmDialog).toBeVisible();
      expect(screen.getByText('Make channel private')).toBeVisible();
      expect(
        screen.getByText(
          /Only users with view-only or edit permissions will be able to access Channel Test/,
        ),
      ).toBeVisible();
    });

    it('confirm make private should close the dialog', async () => {
      const makePrivateButton = screen.getByText('Make private');
      await user.click(makePrivateButton);
      const confirmButton = screen.getByRole('button', { name: 'Make private' });
      await user.click(confirmButton);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('menu visibility', () => {
    it('should show correct menu items for deleted channel', () => {
      renderComponent({ deleted: true });
      expect(screen.getByText('Restore')).toBeVisible();
      expect(screen.getByText('Delete permanently')).toBeVisible();
      expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
      expect(screen.queryByText('Make public')).not.toBeInTheDocument();
    });

    it('should show correct menu items for live private channel', () => {
      renderComponent({ public: false, deleted: false });
      expect(screen.getByText('Download PDF')).toBeVisible();
      expect(screen.getByText('Download CSV')).toBeVisible();
      expect(screen.getByText('Make public')).toBeVisible();
      expect(screen.getByText('Delete channel')).toBeVisible();
      expect(screen.queryByText('Restore')).not.toBeInTheDocument();
    });

    it('should show correct menu items for live public channel', () => {
      renderComponent({ public: true, deleted: false });
      expect(screen.getByText('Download PDF')).toBeVisible();
      expect(screen.getByText('Download CSV')).toBeVisible();
      expect(screen.getByText('Make private')).toBeVisible();
      expect(screen.queryByText('Delete channel')).not.toBeInTheDocument();
      expect(screen.queryByText('Restore')).not.toBeInTheDocument();
    });
  });
});
