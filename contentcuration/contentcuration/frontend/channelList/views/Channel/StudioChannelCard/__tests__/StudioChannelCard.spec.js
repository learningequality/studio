import { render, screen, within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import StudioChannelCard from '../index.vue';

const CHANNEL = {
  id: 'channel-id',
  name: 'Channel title',
  language: 'en',
  description: 'Channel description',
  last_published: '2025-08-25T15:00:00Z',
  modified: '2026-01-10T08:00:00Z',
  count: 3,
  edit: true,
  published: true,
  bookmark: false,
  source_url: 'https://source.example.com',
  demo_server_url: 'https://demo.example.com',
};

const router = new VueRouter({
  routes: [
    { name: 'CHANNEL_DETAILS', path: '/:channelId/details' },
    { name: 'CHANNEL_EDIT', path: '/:channelId/:tab' },
  ],
});

const deleteChannel = jest.fn().mockResolvedValue();
const removeViewer = jest.fn().mockResolvedValue();
const bookmarkChannel = jest.fn().mockResolvedValue();

const store = new Store({
  state: {
    session: {
      currentUser: { id: 'user-id' },
    },
  },
  actions: {
    showSnackbarSimple: jest.fn(),
  },
  modules: {
    channel: {
      namespaced: true,
      getters: {
        getChannel: () => () => CHANNEL,
      },
      actions: {
        deleteChannel,
        removeViewer,
        bookmarkChannel,
      },
    },
  },
});

function renderComponent(props = {}) {
  return render(StudioChannelCard, {
    store,
    props: {
      channel: CHANNEL,
      headingLevel: 2,
      ...props,
    },
    routes: router,
  });
}

describe('StudioChannelCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    router.push('/').catch(() => {});
  });

  it('shows channel title', () => {
    renderComponent();
    expect(screen.getAllByText('Channel title').length).toBeGreaterThan(0);
  });

  it('shows channel description', () => {
    renderComponent();
    expect(screen.getByText('Channel description')).toBeInTheDocument();
  });

  it('shows channel language', () => {
    renderComponent();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('shows resource count', () => {
    renderComponent();
    expect(screen.getByText('3 resources')).toBeInTheDocument();
  });

  it('shows correct publish status for a published channel', () => {
    renderComponent();
    expect(screen.getByText(/^Published/)).toBeInTheDocument();
    expect(screen.queryByText('Unpublished')).not.toBeInTheDocument();
  });

  it('shows correct published status for an unpublished channel', () => {
    renderComponent({ channel: { ...CHANNEL, last_published: null } });
    expect(screen.getByText('Unpublished')).toBeInTheDocument();
  });

  describe('footer buttons', () => {
    it('shows only details button by default', () => {
      renderComponent();
      expect(screen.getByRole('link', { name: 'Details' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /starred channels/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Copy channel token' })).not.toBeInTheDocument();
    });

    it('navigates to channel details page on info button click', async () => {
      renderComponent();
      const detailsLink = screen.getByRole('link', { name: 'Details' });
      expect(router.currentRoute.path).toBe('/');
      await userEvent.click(detailsLink);
      expect(router.currentRoute.path).toBe('/channel-id/details');
    });

    it('shows copy button when footerButtons includes "copy"', () => {
      renderComponent({ footerButtons: ['copy'] });
      expect(screen.getByRole('button', { name: 'Copy channel token' })).toBeInTheDocument();
    });

    it('clicking copy button shows copy token modal', async () => {
      renderComponent({ footerButtons: ['copy'] });
      const button = screen.getByRole('button', { name: 'Copy channel token' });
      userEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByText('Paste this token into Kolibri to import this channel'),
        ).toBeInTheDocument();
      });
    });

    it('shows bookmark button when footerButtons includes "bookmark"', () => {
      renderComponent({ footerButtons: ['bookmark'] });
      expect(screen.getByRole('button', { name: 'Add to starred channels' })).toBeInTheDocument();
    });

    it('bookmarks the channel on bookmark button click', async () => {
      renderComponent({ channel: { ...CHANNEL, bookmark: false }, footerButtons: ['bookmark'] });
      await userEvent.click(screen.getByRole('button', { name: 'Add to starred channels' }));
      await waitFor(() => {
        expect(bookmarkChannel).toHaveBeenCalledWith(expect.anything(), {
          id: 'channel-id',
          bookmark: true,
        });
      });
    });

    it('unbookmarks the channel on bookmark button click', async () => {
      renderComponent({ channel: { ...CHANNEL, bookmark: true }, footerButtons: ['bookmark'] });
      await userEvent.click(screen.getByRole('button', { name: 'Remove from starred channels' }));
      await waitFor(() => {
        expect(bookmarkChannel).toHaveBeenCalledWith(expect.anything(), {
          id: 'channel-id',
          bookmark: false,
        });
      });
    });
  });

  describe('dropdown menu', () => {
    async function openDropdown(dropdownOptions) {
      renderComponent({ dropdownOptions });
      const dropdownButton = screen.getByRole('button', { name: 'More options' });
      await userEvent.click(dropdownButton);
      return screen.getByRole('menu');
    }

    it('does not show dropdown by default', () => {
      renderComponent();
      expect(screen.queryByRole('button', { name: 'More options' })).not.toBeInTheDocument();
    });

    it('shows dropdown when dropdownOptions provided', async () => {
      const menu = await openDropdown(['edit']);
      expect(screen.getByRole('button', { name: 'More options' })).toBeInTheDocument();
      expect(within(menu).getByText('Edit channel details')).toBeInTheDocument();

      // also check that options are not displayed when not configured via dropdownOptions
      expect(within(menu).queryByText('Copy channel token')).not.toBeInTheDocument();
      expect(within(menu).queryByText('Go to source website')).not.toBeInTheDocument();
      expect(within(menu).queryByText('View channel on Kolibri')).not.toBeInTheDocument();
      expect(within(menu).queryByText('Delete channel')).not.toBeInTheDocument();
      expect(within(menu).queryByText('Remove channel')).not.toBeInTheDocument();
    });

    it('has "Edit channel details" when "dropdownOptions" includes "edit"', async () => {
      const menu = await openDropdown(['edit']);

      // clicking the option navigates to the channel edit page
      expect(router.currentRoute.path).toBe('/');
      await userEvent.click(within(menu).getByText('Edit channel details'));
      expect(router.currentRoute.path).toBe('/channel-id/edit');
    });

    it('has "Copy channel token" when "dropdownOptions" includes "copy"', async () => {
      const menu = await openDropdown(['copy']);
      await userEvent.click(within(menu).getByText('Copy channel token'));

      // clicking the option shows  copy token modal
      await waitFor(() => {
        expect(
          screen.getByText('Paste this token into Kolibri to import this channel'),
        ).toBeInTheDocument();
      });
    });

    it('has "Go to source website" when "dropdownOptions" includes "source-url"', async () => {
      window.open = jest.fn();
      const menu = await openDropdown(['source-url']);
      await userEvent.click(within(menu).getByText('Go to source website'));

      // clicking the option opens the URL in a new tab
      expect(window.open).toHaveBeenCalledWith('https://source.example.com', '_blank');
    });

    it('has "View channel on Kolibri" when "dropdownOptions" includes "demo-url"', async () => {
      window.open = jest.fn();
      const menu = await openDropdown(['demo-url']);
      await userEvent.click(within(menu).getByText('View channel on Kolibri'));

      // clicking the option opens the URL in a new tab
      expect(window.open).toHaveBeenCalledWith('https://demo.example.com', '_blank');
    });

    it('has "Delete channel" when "dropdownOptions" includes "delete"', async () => {
      const menu = await openDropdown(['delete']);
      await userEvent.click(within(menu).getByText('Delete channel'));

      // clicking the option opens the confirmation dialog
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      const submitButton = within(dialog).getByText('Delete channel');

      // confirming calls 'deleteChannel' action
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(deleteChannel).toHaveBeenCalledWith(expect.anything(), 'channel-id');
      });
    });

    it('has "Remove channel" when "dropdownOptions" includes "remove"', async () => {
      const menu = await openDropdown(['remove']);
      await userEvent.click(within(menu).getByText('Remove channel'));

      // clicking the option opens the confirmation dialog
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      const submitButton = within(dialog).getByText('Remove');

      // confirming calls 'removeViewer' action
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(removeViewer).toHaveBeenCalledWith(expect.anything(), {
          channelId: 'channel-id',
          userId: 'user-id',
        });
      });
    });
  });
});
