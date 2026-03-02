import { useChannelVersionHistory, VERSIONS_PER_PAGE } from '../useChannelVersionHistory';
import { ChannelVersion } from 'shared/data/resources';

jest.mock('shared/data/resources', () => ({
  ChannelVersion: {
    fetchCollection: jest.fn(),
  },
}));

describe('useChannelVersionHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchVersions', () => {
    it('fetches first page of versions successfully', async () => {
      const mockVersions = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        version: 5 - i,
        version_notes: `Version ${5 - i}`,
      }));
      const mockMore = { channel: 'channel-id', cursor: 'abc123' };
      ChannelVersion.fetchCollection.mockResolvedValue({
        results: mockVersions,
        more: mockMore,
      });

      const { fetchVersions, versions, isLoading, hasMore } = useChannelVersionHistory();

      expect(isLoading.value).toBe(false);

      const fetchPromise = fetchVersions('channel-id');
      expect(isLoading.value).toBe(true);

      await fetchPromise;

      expect(ChannelVersion.fetchCollection).toHaveBeenCalledWith({
        channel: 'channel-id',
        max_results: VERSIONS_PER_PAGE,
        version__gte: 0,
      });
      expect(versions.value).toEqual(mockVersions);
      expect(hasMore.value).toBe(true);
      expect(isLoading.value).toBe(false);
    });

    it('sets hasMore to false when no more object', async () => {
      ChannelVersion.fetchCollection.mockResolvedValue({
        results: [{ id: 1, version: 1 }],
        more: null,
      });

      const { fetchVersions, hasMore } = useChannelVersionHistory();
      await fetchVersions('channel-id');

      expect(hasMore.value).toBe(false);
    });

    it('handles errors during fetch', async () => {
      const mockError = new Error('Network error');
      ChannelVersion.fetchCollection.mockRejectedValue(mockError);

      const { fetchVersions, versions, error, isLoading } = useChannelVersionHistory();

      await fetchVersions('channel-id');

      expect(error.value).toBe(mockError);
      expect(versions.value).toEqual([]);
      expect(isLoading.value).toBe(false);
    });

    it('resets state before fetching new versions', async () => {
      ChannelVersion.fetchCollection.mockResolvedValue({
        results: [{ id: 1, version: 1 }],
        more: null,
      });

      const { fetchVersions, versions } = useChannelVersionHistory();

      // First fetch
      await fetchVersions('channel-1');
      expect(versions.value.length).toBe(1);

      // Second fetch should reset
      ChannelVersion.fetchCollection.mockResolvedValue({
        results: [
          { id: 2, version: 2 },
          { id: 3, version: 3 },
        ],
        more: null,
      });
      await fetchVersions('channel-2');

      expect(versions.value.length).toBe(2);
    });

    it('clears error on new fetch', async () => {
      const mockError = new Error('Network error');
      ChannelVersion.fetchCollection.mockRejectedValue(mockError);

      const { fetchVersions, error } = useChannelVersionHistory();
      await fetchVersions('channel-id');
      expect(error.value).toBe(mockError);

      // Successful fetch should clear error
      ChannelVersion.fetchCollection.mockResolvedValue({
        results: [{ id: 1, version: 1 }],
        more: null,
      });
      await fetchVersions('channel-id');
      expect(error.value).toBe(null);
    });
  });

  describe('fetchMore', () => {
    it('fetches next page using cursor and appends to existing versions', async () => {
      const page1 = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, version: 5 - i }));
      const page2 = [{ id: 6, version: 1 }];
      const moreParams = { channel: 'channel-id', cursor: 'cursor123' };

      ChannelVersion.fetchCollection
        .mockResolvedValueOnce({ results: page1, more: moreParams })
        .mockResolvedValueOnce({ results: page2, more: null });

      const { fetchVersions, fetchMore, versions, hasMore } = useChannelVersionHistory();

      await fetchVersions('channel-id');
      expect(versions.value).toEqual(page1);
      expect(hasMore.value).toBe(true);

      await fetchMore();

      expect(ChannelVersion.fetchCollection).toHaveBeenCalledTimes(2);
      expect(ChannelVersion.fetchCollection).toHaveBeenLastCalledWith(moreParams);
      expect(versions.value).toEqual([...page1, ...page2]);
      expect(hasMore.value).toBe(false);
    });

    it('does not fetch when hasMore is false', async () => {
      ChannelVersion.fetchCollection.mockResolvedValue({
        results: [{ id: 1, version: 1 }],
        more: null,
      });

      const { fetchVersions, fetchMore } = useChannelVersionHistory();
      await fetchVersions('channel-id');

      ChannelVersion.fetchCollection.mockClear();
      await fetchMore();

      expect(ChannelVersion.fetchCollection).not.toHaveBeenCalled();
    });

    it('does not fetch when isLoadingMore is true', async () => {
      const fullPage = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, version: i + 1 }));
      const moreParams = { channel: 'channel-id', cursor: 'cursor123' };
      ChannelVersion.fetchCollection.mockResolvedValue({
        results: fullPage,
        more: moreParams,
      });

      const { fetchVersions, fetchMore, isLoadingMore } = useChannelVersionHistory();
      await fetchVersions('channel-id');

      // Start first fetchMore but don't await
      ChannelVersion.fetchCollection.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ results: [], more: null }), 100)),
      );

      const promise1 = fetchMore();
      expect(isLoadingMore.value).toBe(true);

      // Try to fetch more while already loading
      await fetchMore();

      expect(ChannelVersion.fetchCollection).toHaveBeenCalledTimes(2); // Initial + first fetchMore only

      await promise1;
    });

    it('does not fetch when no initial fetch has been made', async () => {
      const { fetchMore } = useChannelVersionHistory();

      await fetchMore();

      expect(ChannelVersion.fetchCollection).not.toHaveBeenCalled();
    });

    it('handles errors during fetchMore', async () => {
      const mockError = new Error('Network error');
      const fullPage = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, version: i + 1 }));
      const moreParams = { channel: 'channel-id', cursor: 'cursor123' };
      ChannelVersion.fetchCollection
        .mockResolvedValueOnce({ results: fullPage, more: moreParams })
        .mockRejectedValueOnce(mockError);

      const { fetchVersions, fetchMore, error, versions, isLoadingMore } =
        useChannelVersionHistory();

      await fetchVersions('channel-id');
      const initialVersions = versions.value;

      await fetchMore();

      expect(error.value).toBe(mockError);
      expect(versions.value).toEqual(initialVersions); // Versions should remain unchanged
      expect(isLoadingMore.value).toBe(false);
    });

    it('clears error before fetching more', async () => {
      const mockError = new Error('Network error');
      const fullPage = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, version: i + 1 }));
      const moreParams = { channel: 'channel-id', cursor: 'cursor123' };
      ChannelVersion.fetchCollection
        .mockResolvedValueOnce({ results: fullPage, more: moreParams })
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ results: [{ id: 6, version: 6 }], more: null });

      const { fetchVersions, fetchMore, error, hasMore } = useChannelVersionHistory();

      await fetchVersions('channel-id');
      expect(hasMore.value).toBe(true);

      await fetchMore(); // This will fail
      expect(error.value).toBe(mockError);
      // hasMore should still be true since the error didn't update moreObject
      expect(hasMore.value).toBe(true);

      await fetchMore(); // This should succeed and clear error
      expect(error.value).toBe(null);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      const fullPage = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, version: i + 1 }));
      const moreParams = { channel: 'channel-id', cursor: 'cursor123' };
      ChannelVersion.fetchCollection.mockResolvedValue({
        results: fullPage,
        more: moreParams,
      });

      const { fetchVersions, reset, versions, isLoading, isLoadingMore, error, hasMore } =
        useChannelVersionHistory();

      await fetchVersions('channel-id');
      expect(versions.value.length).toBe(5);
      expect(hasMore.value).toBe(true);

      reset();

      expect(versions.value).toEqual([]);
      expect(isLoading.value).toBe(false);
      expect(isLoadingMore.value).toBe(false);
      expect(error.value).toBe(null);
      expect(hasMore.value).toBe(false);
    });

    it('allows fetching after reset', async () => {
      ChannelVersion.fetchCollection.mockResolvedValue({
        results: [{ id: 1, version: 1 }],
        more: null,
      });

      const { fetchVersions, reset, versions } = useChannelVersionHistory();

      await fetchVersions('channel-1');
      expect(versions.value.length).toBe(1);

      reset();
      expect(versions.value).toEqual([]);

      await fetchVersions('channel-2');
      expect(versions.value.length).toBe(1);
      expect(ChannelVersion.fetchCollection).toHaveBeenCalledTimes(2);
    });
  });
});
