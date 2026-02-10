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
    // The title is rendered twice, once as visually hidden
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

  it('shows correct publish status for a published channel', async () => {
    renderComponent();
    const publishStatus = await screen.findByTestId('publish-status');
    expect(publishStatus).not.toHaveTextContent('Unpublished');
    expect(publishStatus).toHaveTextContent('Published');
  });

  it('shows correct published status for an unpublished channel', async () => {
    renderComponent({ channel: { ...CHANNEL, last_published: null } });
    const publishStatus = await screen.findByTestId('publish-status');
    expect(publishStatus).toHaveTextContent('Unpublished');
  });

  it('navigates to channel details page on detail button click', async () => {
    renderComponent();
    const detailsButton = await screen.findByTestId('details-button');
    expect(router.currentRoute.path).toBe('/');
    await userEvent.click(detailsButton);
    expect(router.currentRoute.path).toBe('/channel-id/details');
  });

  it('bookmarks the channel on bookmark button click', async () => {
    renderComponent({ channel: { ...CHANNEL, bookmark: false } });
    const [bookmarkWrapper] = screen.getAllByTestId('bookmark-button');
    const bookmarkBtn = within(bookmarkWrapper).getByRole('button');
    await userEvent.click(bookmarkBtn);

    await waitFor(() => {
      expect(bookmarkChannel).toHaveBeenCalledWith(expect.anything(), {
        id: 'channel-id',
        bookmark: true,
      });
    });
  });

  it('unbookmarks the channel on bookmark button click', async () => {
    renderComponent({ channel: { ...CHANNEL, bookmark: true } });
    const [bookmarkWrapper] = screen.getAllByTestId('bookmark-button');
    const bookmarkBtn = within(bookmarkWrapper).getByRole('button');
    await userEvent.click(bookmarkBtn);

    await waitFor(() => {
      expect(bookmarkChannel).toHaveBeenCalledWith(expect.anything(), {
        id: 'channel-id',
        bookmark: false,
      });
    });
  });

  describe('dropdown menu', () => {
    async function openDropdown(channelOverrides = {}) {
      renderComponent({ channel: { ...CHANNEL, ...channelOverrides } });
      const dropdownButton = await screen.findByTestId('dropdown-button');
      await userEvent.click(dropdownButton);
      return screen.getByRole('menu');
    }

    it('opens dropdown on click', async () => {
      const menu = await openDropdown();
      expect(within(menu).getByText('Edit channel details')).toBeInTheDocument();
      expect(within(menu).getByText('Copy channel token')).toBeInTheDocument();
    });

    it('does not show edit for non-editable channel', async () => {
      const menu = await openDropdown({ edit: false });
      expect(within(menu).queryByText('Edit channel details')).not.toBeInTheDocument();
    });

    it('shows edit for editable channel and goes to the correct route on click', async () => {
      const menu = await openDropdown({ edit: true });
      expect(router.currentRoute.path).toBe('/');
      await userEvent.click(within(menu).getByText('Edit channel details'));
      expect(router.currentRoute.path).toBe('/channel-id/edit');
    });

    it('shows delete for editable channel and calls the correct action on confirm', async () => {
      const menu = await openDropdown({ edit: true });
      await userEvent.click(within(menu).getByText('Delete channel'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const submitButton = within(dialog).getByText('Delete channel');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(deleteChannel).toHaveBeenCalledWith(expect.anything(), 'channel-id');
      });
    });

    it('shows remove from list for non-editable channel and calls the correct action on confirm', async () => {
      const menu = await openDropdown({ edit: false });
      expect(within(menu).queryByText('Delete channel')).not.toBeInTheDocument();
      await userEvent.click(within(menu).getByText('Remove from channel list'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const submitButton = within(dialog).getByText('Remove');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(removeViewer).toHaveBeenCalledWith(expect.anything(), {
          channelId: 'channel-id',
          userId: 'user-id',
        });
      });
    });

    it('shows copy token for published channel and opens modal on click', async () => {
      const menu = await openDropdown({ published: true });
      await userEvent.click(within(menu).getByText('Copy channel token'));

      await waitFor(() => {
        expect(
          screen.getByText('Paste this token into Kolibri to import this channel'),
        ).toBeInTheDocument();
      });
    });

    it('does not show copy token for unpublished channel', async () => {
      const menu = await openDropdown({ published: false });
      expect(within(menu).queryByText('Copy channel token')).not.toBeInTheDocument();
    });

    it('does not show go to source website if channel has no source url', async () => {
      const menu = await openDropdown({ source_url: '' });
      expect(within(menu).queryByText('Go to source website')).not.toBeInTheDocument();
    });

    it('shows go to source website and opens in new tab on click', async () => {
      window.open = jest.fn();
      const menu = await openDropdown({ source_url: 'https://source.example.com' });
      await userEvent.click(within(menu).getByText('Go to source website'));
      expect(window.open).toHaveBeenCalledWith('https://source.example.com', '_blank');
    });

    it('does not show go to demo server if channel has no demo server url', async () => {
      const menu = await openDropdown({ demo_server_url: '' });
      expect(within(menu).queryByText('View channel on Kolibri')).not.toBeInTheDocument();
    });

    it('shows go to demo server and opens in new tab on click', async () => {
      window.open = jest.fn();
      const menu = await openDropdown({ demo_server_url: 'https://demo.example.com' });
      await userEvent.click(within(menu).getByText('View channel on Kolibri'));
      expect(window.open).toHaveBeenCalledWith('https://demo.example.com', '_blank');
    });
  });
});
