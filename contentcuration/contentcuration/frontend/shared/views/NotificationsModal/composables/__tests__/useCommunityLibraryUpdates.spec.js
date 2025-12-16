import { ref } from 'vue';
import useCommunityLibraryUpdates from '../useCommunityLibraryUpdates';
import { CommunityLibraryStatus, NotificationType } from 'shared/constants';

import { CommunityLibrarySubmission } from 'shared/data/resources';

jest.mock('shared/data/resources', () => ({
  CommunityLibrarySubmission: {
    fetchCollection: jest.fn(),
  },
}));

describe('useCommunityLibraryUpdates', () => {
  let mockFetchCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFetchCollection = CommunityLibrarySubmission.fetchCollection;
  });

  const createMockSubmission = (overrides = {}) => ({
    id: 1,
    description: 'Test submission',
    channel_id: 'channel-1',
    channel_name: 'Test Channel',
    channel_version: 1,
    author_id: 'user-1',
    author_name: 'John Doe',
    categories: ['math'],
    date_created: '2026-01-01T00:00:00Z',
    status: CommunityLibraryStatus.PENDING,
    resolution_reason: null,
    feedback_notes: null,
    date_updated: '2026-01-02T00:00:00Z',
    resolved_by_id: null,
    resolved_by_name: null,
    countries: ['US'],
    ...overrides,
  });

  describe('initialization', () => {
    it('should return expected properties', () => {
      const result = useCommunityLibraryUpdates();

      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('submissionsUpdates');
      expect(result).toHaveProperty('isLoading');
      expect(result).toHaveProperty('isLoadingMore');
      expect(result).toHaveProperty('fetchData');
      expect(result).toHaveProperty('fetchMore');
    });

    it('should initialize with correct default values', () => {
      const { hasMore, submissionsUpdates, isLoading, isLoadingMore } =
        useCommunityLibraryUpdates();

      expect(hasMore.value).toBe(false);
      expect(submissionsUpdates.value).toEqual([]);
      expect(isLoading.value).toBe(false);
      expect(isLoadingMore.value).toBe(false);
    });
  });

  describe('getSubmissionsUpdates transformation', () => {
    it('should create a creation update for PENDING submissions', async () => {
      const CREATION_DATE = '2026-01-01T00:00:00Z';

      const mockSubmissions = [
        createMockSubmission({
          status: CommunityLibraryStatus.PENDING,
          date_created: CREATION_DATE,
        }),
      ];

      mockFetchCollection.mockResolvedValue({
        results: mockSubmissions,
        more: null,
      });

      const { fetchData, submissionsUpdates } = useCommunityLibraryUpdates();

      await fetchData();

      expect(submissionsUpdates.value).toHaveLength(1);
      expect(submissionsUpdates.value[0].type).toBe(
        NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED,
      );
      expect(submissionsUpdates.value[0].date).toEqual(new Date(CREATION_DATE));
    });

    it('should create two updates for APPROVED submissions', async () => {
      const CREATION_DATE = '2026-01-01T00:00:00Z';
      const UPDATE_DATE = '2026-01-03T00:00:00Z';

      const mockSubmissions = [
        createMockSubmission({
          status: CommunityLibraryStatus.APPROVED,
          date_updated: UPDATE_DATE,
          date_created: CREATION_DATE,
        }),
      ];

      mockFetchCollection.mockResolvedValue({
        results: mockSubmissions,
        more: null,
      });

      const { fetchData, submissionsUpdates } = useCommunityLibraryUpdates();

      await fetchData();

      expect(submissionsUpdates.value).toHaveLength(2);
      expect(submissionsUpdates.value[0].type).toBe(
        NotificationType.COMMUNITY_LIBRARY_SUBMISSION_APPROVED,
      );
      expect(submissionsUpdates.value[0].date).toEqual(new Date(UPDATE_DATE));
      expect(submissionsUpdates.value[1].type).toBe(
        NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED,
      );
      expect(submissionsUpdates.value[1].date).toEqual(new Date(CREATION_DATE));
    });

    it('should create two updates for REJECTED submissions', async () => {
      const CREATION_DATE = '2026-01-01T00:00:00Z';
      const UPDATE_DATE = '2026-01-03T00:00:00Z';

      const mockSubmissions = [
        createMockSubmission({
          status: CommunityLibraryStatus.REJECTED,
          date_created: CREATION_DATE,
          date_updated: UPDATE_DATE,
        }),
      ];

      mockFetchCollection.mockResolvedValue({
        results: mockSubmissions,
        more: null,
      });

      const { fetchData, submissionsUpdates } = useCommunityLibraryUpdates();

      await fetchData();

      expect(submissionsUpdates.value).toHaveLength(2);
      expect(submissionsUpdates.value[0].type).toBe(
        NotificationType.COMMUNITY_LIBRARY_SUBMISSION_REJECTED,
      );
      expect(submissionsUpdates.value[0].date).toEqual(new Date(UPDATE_DATE));
      expect(submissionsUpdates.value[1].type).toBe(
        NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED,
      );
      expect(submissionsUpdates.value[1].date).toEqual(new Date(CREATION_DATE));
    });

    it('should handle LIVE status correctly', async () => {
      const CREATION_DATE = '2026-01-01T00:00:00Z';
      const UPDATE_DATE = '2026-01-03T00:00:00Z';

      const mockSubmissions = [
        createMockSubmission({
          status: CommunityLibraryStatus.LIVE,
          date_created: CREATION_DATE,
          date_updated: UPDATE_DATE,
        }),
      ];

      mockFetchCollection.mockResolvedValue({
        results: mockSubmissions,
        more: null,
      });

      const { fetchData, submissionsUpdates } = useCommunityLibraryUpdates();

      await fetchData();

      expect(submissionsUpdates.value).toHaveLength(2);
      expect(submissionsUpdates.value[0].type).toBe(
        NotificationType.COMMUNITY_LIBRARY_SUBMISSION_APPROVED,
      );
      expect(submissionsUpdates.value[0].date).toEqual(new Date(UPDATE_DATE));
      expect(submissionsUpdates.value[1].type).toBe(
        NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED,
      );
      expect(submissionsUpdates.value[1].date).toEqual(new Date(CREATION_DATE));
    });
  });

  describe('date filtering', () => {
    it('should filter by date_updated__lte', async () => {
      const LTE_DATE = '2026-01-02T12:00:00Z';
      const CREATION_DATE = '2026-01-01T00:00:00Z';
      const UPDATE_DATE_BEFORE = '2026-01-02T00:00:00Z';
      const UPDATE_DATE_AFTER = '2026-01-03T00:00:00Z';

      const queryParams = ref({
        date_updated__lte: LTE_DATE,
      });

      const mockSubmissions = [
        createMockSubmission({
          id: 1,
          date_created: CREATION_DATE,
          date_updated: UPDATE_DATE_BEFORE,
          status: CommunityLibraryStatus.APPROVED,
        }),
        createMockSubmission({
          id: 2,
          date_created: CREATION_DATE,
          date_updated: UPDATE_DATE_AFTER,
          status: CommunityLibraryStatus.APPROVED,
        }),
      ];

      mockFetchCollection.mockResolvedValue({
        results: mockSubmissions,
        more: null,
      });

      const { fetchData, submissionsUpdates } = useCommunityLibraryUpdates({ queryParams });

      await fetchData();

      // Should include: 2 creation updates + 1 approval update (the other approval is after lte)
      expect(submissionsUpdates.value).toHaveLength(3);
      expect(submissionsUpdates.value.every(update => update.date <= new Date(LTE_DATE))).toBe(
        true,
      );
    });

    it('should filter by date_updated__gte', async () => {
      const GTE_DATE = '2026-01-02T00:00:00Z';
      const CREATION_DATE = '2025-12-31T00:00:00Z';
      const UPDATE_DATE = '2026-01-02T00:00:00Z';

      const queryParams = ref({
        date_updated__gte: GTE_DATE,
      });

      const mockSubmissions = [
        createMockSubmission({
          id: 1,
          date_created: CREATION_DATE,
          date_updated: UPDATE_DATE,
          status: CommunityLibraryStatus.APPROVED,
        }),
      ];

      mockFetchCollection.mockResolvedValue({
        results: mockSubmissions,
        more: null,
      });

      const { fetchData, submissionsUpdates } = useCommunityLibraryUpdates({ queryParams });

      await fetchData();

      // Should include only 1 approval update (creation update is before gte)
      expect(submissionsUpdates.value).toHaveLength(1);
      expect(submissionsUpdates.value[0].type).toBe(
        NotificationType.COMMUNITY_LIBRARY_SUBMISSION_APPROVED,
      );
    });
  });

  describe('status filtering', () => {
    it('should filter by status__in', async () => {
      const queryParams = ref({
        status__in: `${CommunityLibraryStatus.APPROVED},${CommunityLibraryStatus.REJECTED}`,
      });

      const mockSubmissions = [
        createMockSubmission({
          id: 1,
          status: CommunityLibraryStatus.APPROVED,
        }),
        createMockSubmission({
          id: 2,
          status: CommunityLibraryStatus.PENDING,
        }),
      ];

      mockFetchCollection.mockResolvedValue({
        results: mockSubmissions,
        more: null,
      });

      const { fetchData, submissionsUpdates } = useCommunityLibraryUpdates({ queryParams });

      await fetchData();

      // Should include only the approval update (not creation updates or pending updates)
      expect(submissionsUpdates.value).toHaveLength(1);
      expect(submissionsUpdates.value[0].type).toBe(
        NotificationType.COMMUNITY_LIBRARY_SUBMISSION_APPROVED,
      );
    });
  });

  describe('query parameters', () => {
    it('should pass search keywords as search parameter', async () => {
      const queryParams = ref({
        keywords: 'test search',
      });

      mockFetchCollection.mockResolvedValue({
        results: [],
        more: null,
      });

      const { fetchData } = useCommunityLibraryUpdates({ queryParams });

      await fetchData();

      expect(mockFetchCollection).toHaveBeenCalledWith({
        search: 'test search',
        max_results: 10,
      });
    });

    it('should include date and status filters in API call', async () => {
      const LTE_DATE = '2026-01-02T00:00:00Z';
      const GTE_DATE = '2026-01-01T00:00:00Z';

      const queryParams = ref({
        date_updated__lte: LTE_DATE,
        date_updated__gte: GTE_DATE,
        status__in: CommunityLibraryStatus.APPROVED,
      });

      mockFetchCollection.mockResolvedValue({
        results: [],
        more: null,
      });

      const { fetchData } = useCommunityLibraryUpdates({ queryParams });

      await fetchData();

      expect(mockFetchCollection).toHaveBeenCalledWith({
        date_updated__lte: LTE_DATE,
        date_updated__gte: GTE_DATE,
        status__in: CommunityLibraryStatus.APPROVED,
        max_results: 10,
      });
    });

    it('should omit undefined query parameters', async () => {
      const queryParams = ref({
        keywords: undefined,
        date_updated__lte: null,
      });

      mockFetchCollection.mockResolvedValue({
        results: [],
        more: null,
      });

      const { fetchData } = useCommunityLibraryUpdates({ queryParams });

      await fetchData();

      expect(mockFetchCollection).toHaveBeenCalledWith({
        max_results: 10,
      });
    });
  });

  describe('sorting', () => {
    it('should sort updates by date in descending order', async () => {
      const CREATION_DATE_1 = '2026-01-01T00:00:00Z';
      const CREATION_DATE_2 = '2026-01-02T00:00:00Z';
      const UPDATE_DATE_1 = '2026-01-03T00:00:00Z';
      const UPDATE_DATE_2 = '2026-01-04T00:00:00Z';

      const mockSubmissions = [
        createMockSubmission({
          id: 1,
          date_created: CREATION_DATE_1,
          date_updated: UPDATE_DATE_1,
          status: CommunityLibraryStatus.APPROVED,
        }),
        createMockSubmission({
          id: 2,
          date_created: CREATION_DATE_2,
          date_updated: UPDATE_DATE_2,
          status: CommunityLibraryStatus.REJECTED,
        }),
      ];

      mockFetchCollection.mockResolvedValue({
        results: mockSubmissions,
        more: null,
      });

      const { fetchData, submissionsUpdates } = useCommunityLibraryUpdates();

      await fetchData();

      expect(submissionsUpdates.value).toHaveLength(4);

      const dates = submissionsUpdates.value.map(update => update.date.getTime());
      expect(dates).toEqual([...dates].sort((a, b) => b - a));

      // Verify the specific order
      expect(submissionsUpdates.value[0].date).toEqual(new Date(UPDATE_DATE_2));
      expect(submissionsUpdates.value[1].date).toEqual(new Date(UPDATE_DATE_1));
      expect(submissionsUpdates.value[2].date).toEqual(new Date(CREATION_DATE_2));
      expect(submissionsUpdates.value[3].date).toEqual(new Date(CREATION_DATE_1));
    });
  });
});
