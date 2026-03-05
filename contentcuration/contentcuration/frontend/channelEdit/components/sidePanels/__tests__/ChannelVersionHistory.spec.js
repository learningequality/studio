import { render, fireEvent, waitFor, screen } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { ref } from 'vue';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';
import ChannelVersionHistory from '../ChannelVersionHistory.vue';
import { useChannelVersionHistory } from 'shared/composables/useChannelVersionHistory';
import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

const localVue = createLocalVue();
localVue.use(VueRouter);
localVue.use(KThemePlugin);

jest.mock('shared/composables/useChannelVersionHistory');

describe('ChannelVersionHistory', () => {
  let mockComposable;

  beforeEach(() => {
    jest.clearAllMocks();

    mockComposable = {
      versions: ref([]),
      isLoading: ref(false),
      isLoadingMore: ref(false),
      error: ref(null),
      hasMore: ref(false),
      fetchVersions: jest.fn(),
      fetchMore: jest.fn(),
      reset: jest.fn(),
    };

    useChannelVersionHistory.mockReturnValue(mockComposable);
  });

  const renderComponent = (props = {}) => {
    const router = new VueRouter();
    return render(ChannelVersionHistory, {
      localVue,
      router,
      propsData: {
        channelId: 'test-channel-id',
        ...props,
      },
    });
  };

  describe('initial state', () => {
    it('renders "See all versions" button when collapsed', () => {
      renderComponent();
      expect(screen.getByText(communityChannelsStrings.seeAllVersions$())).toBeInTheDocument();
    });

    it('does not show versions list when collapsed', () => {
      mockComposable.versions.value = [{ id: 1, version: 1, version_notes: 'Test' }];
      renderComponent();

      expect(
        screen.queryByText(communityChannelsStrings.versionLabel$({ version: 1 })),
      ).not.toBeInTheDocument();
    });
  });

  describe('expanding', () => {
    it('fetches versions when expanded for the first time', async () => {
      renderComponent();

      const expandButton = screen.getByText(communityChannelsStrings.seeAllVersions$());
      await fireEvent.click(expandButton);

      expect(mockComposable.fetchVersions).toHaveBeenCalledWith('test-channel-id');
    });

    it('does not fetch again if versions already loaded', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];
      renderComponent();

      const expandButton = screen.getByText(communityChannelsStrings.seeAllVersions$());
      await fireEvent.click(expandButton);

      expect(mockComposable.fetchVersions).not.toHaveBeenCalled();
    });

    it('shows loading indicator when fetching initial versions', async () => {
      mockComposable.isLoading.value = true;
      renderComponent();

      const expandButton = screen.getByText(communityChannelsStrings.seeAllVersions$());
      await fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('shows error message when fetch fails and no versions loaded', async () => {
      renderComponent();

      const expandButton = screen.getByText(communityChannelsStrings.seeAllVersions$());
      await fireEvent.click(expandButton);

      // Simulate error after expansion
      mockComposable.error.value = new Error('Network error');

      await waitFor(() => {
        expect(
          screen.getByText(communityChannelsStrings.errorLoadingVersions$()),
        ).toBeInTheDocument();
      });
    });
  });

  describe('displaying versions', () => {
    it('shows empty state when no versions available', async () => {
      mockComposable.versions.value = [];
      mockComposable.isLoading.value = false;
      mockComposable.error.value = null;

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      await waitFor(() => {
        expect(
          screen.getByText(communityChannelsStrings.noVersionsAvailable$()),
        ).toBeInTheDocument();
      });
    });

    it('renders version list when versions are available', async () => {
      const versions = [
        { id: 1, version: 3, version_notes: 'Version 3 notes' },
        { id: 2, version: 2, version_notes: 'Version 2 notes' },
        { id: 3, version: 1, version_notes: null },
      ];
      mockComposable.versions.value = versions;

      renderComponent();

      const expandButton = screen.getByText(communityChannelsStrings.seeAllVersions$());
      await fireEvent.click(expandButton);

      await waitFor(() => {
        expect(
          screen.getByText(communityChannelsStrings.versionLabel$({ version: 3 })),
        ).toBeInTheDocument();
        expect(
          screen.getByText(communityChannelsStrings.versionLabel$({ version: 2 })),
        ).toBeInTheDocument();
        expect(
          screen.getByText(communityChannelsStrings.versionLabel$({ version: 1 })),
        ).toBeInTheDocument();
      });
    });

    it('renders version descriptions when available', async () => {
      mockComposable.versions.value = [{ id: 1, version: 2, version_notes: 'Added new features' }];

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      await waitFor(() => {
        expect(screen.getByText('Added new features')).toBeInTheDocument();
        expect(
          screen.getByText(communityChannelsStrings.versionDescriptionLabel$()),
        ).toBeInTheDocument();
      });
    });

    it('does not render description section when version_notes is null', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1, version_notes: null }];

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      await waitFor(() => {
        expect(
          screen.queryByText(communityChannelsStrings.versionDescriptionLabel$()),
        ).not.toBeInTheDocument();
      });
    });

    it('shows "See less" button when expanded', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];
      renderComponent();

      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      await waitFor(() => {
        expect(screen.getByText(communityChannelsStrings.seeLess$())).toBeInTheDocument();
      });
    });
  });

  describe('pagination', () => {
    it('shows "Show more" button when hasMore is true', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];
      mockComposable.hasMore.value = true;

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      await waitFor(() => {
        expect(screen.getByText(communityChannelsStrings.showMore$())).toBeInTheDocument();
      });
    });

    it('does not show "Show more" button when hasMore is false', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];
      mockComposable.hasMore.value = false;

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      await waitFor(() => {
        expect(screen.queryByText(communityChannelsStrings.showMore$())).not.toBeInTheDocument();
      });
    });

    it('calls fetchMore when "Show more" is clicked', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];
      mockComposable.hasMore.value = true;

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      const showMoreButton = await screen.findByText(communityChannelsStrings.showMore$());
      await fireEvent.click(showMoreButton);

      expect(mockComposable.fetchMore).toHaveBeenCalled();
    });

    it('disables "Show more" button when loading more', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];
      mockComposable.hasMore.value = true;
      mockComposable.isLoadingMore.value = true;

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      await waitFor(() => {
        const showMoreButton = screen.getByText(communityChannelsStrings.showMore$()).closest('a');
        expect(showMoreButton).toHaveAttribute('disabled');
      });
    });

    it('shows inline loader when loading more', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];
      mockComposable.hasMore.value = true;
      mockComposable.isLoadingMore.value = true;

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      await waitFor(() => {
        const loaders = screen.getAllByRole('progressbar');
        expect(loaders.length).toBeGreaterThan(0);
      });
    });

    it('shows error message when fetchMore fails but versions exist', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];
      mockComposable.hasMore.value = true;
      mockComposable.error.value = new Error('Failed to fetch more');

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      await waitFor(() => {
        const errorMessages = screen.getAllByText(communityChannelsStrings.errorLoadingVersions$());
        expect(errorMessages.length).toBe(1);
      });
    });

    it('shows retry button when fetchMore fails', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];
      mockComposable.hasMore.value = true;
      mockComposable.error.value = new Error('Failed to fetch more');

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      await waitFor(() => {
        expect(screen.getByText(communityChannelsStrings.retry$())).toBeInTheDocument();
      });
    });

    it('calls fetchMore when retry button is clicked', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];
      mockComposable.hasMore.value = true;
      mockComposable.error.value = new Error('Failed to fetch more');

      renderComponent();
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));

      const retryButton = await screen.findByText(communityChannelsStrings.retry$());
      await fireEvent.click(retryButton);

      expect(mockComposable.fetchMore).toHaveBeenCalled();
    });
  });

  describe('collapsing', () => {
    it('hides version list when "See less" is clicked', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];

      renderComponent();

      // Expand
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));
      expect(
        screen.getByText(communityChannelsStrings.versionLabel$({ version: 1 })),
      ).toBeInTheDocument();

      // Collapse
      const seeLessButton = screen.getByText(communityChannelsStrings.seeLess$());
      await fireEvent.click(seeLessButton);

      await waitFor(() => {
        expect(
          screen.queryByText(communityChannelsStrings.versionLabel$({ version: 1 })),
        ).not.toBeInTheDocument();
        expect(screen.getByText(communityChannelsStrings.seeAllVersions$())).toBeInTheDocument();
      });
    });
  });

  describe('channel ID changes', () => {
    it('calls reset when channelId prop changes', async () => {
      mockComposable.versions.value = [{ id: 1, version: 1 }];

      const wrapper = renderComponent({ channelId: 'channel-1' });

      // Expand
      await fireEvent.click(screen.getByText(communityChannelsStrings.seeAllVersions$()));
      await wrapper.updateProps({ channelId: 'channel-2' });

      await waitFor(() => {
        expect(mockComposable.reset).toHaveBeenCalled();
      });
    });

    it('does not reset when channelId remains the same', async () => {
      const wrapper = renderComponent({ channelId: 'channel-1' });

      await wrapper.updateProps({ channelId: 'channel-1' });

      expect(mockComposable.reset).not.toHaveBeenCalled();
    });
  });
});
