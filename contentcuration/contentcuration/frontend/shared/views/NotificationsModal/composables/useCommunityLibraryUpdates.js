import { ref, computed, unref } from 'vue';
import pickBy from 'lodash/pickBy';
import { useFetch } from 'shared/composables/useFetch';
import { CommunityLibrarySubmission } from 'shared/data/resources';
import { CommunityLibraryStatus, NotificationType } from 'shared/constants';
import { commonStrings } from 'shared/strings/commonStrings';
import useSnackbar from 'shared/composables/useSnackbar';

const MAX_RESULTS_PER_PAGE = 10;

const statusToNotificationType = {
  [CommunityLibraryStatus.PENDING]: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED,
  [CommunityLibraryStatus.SUPERSEDED]: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED,
  [CommunityLibraryStatus.REJECTED]: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_REJECTED,
  [CommunityLibraryStatus.APPROVED]: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_APPROVED,
  [CommunityLibraryStatus.LIVE]: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_APPROVED,
};

/**
 * A Vue composable that manages community library submission updates and notifications.
 *
 * This composable handles the logic of fetching and transforming community library
 * submissions into notification updates. It deals with the fact that a single submission
 * can generate up to two notifications (creation + status updates) and provides pagination
 * support with "load more" functionality.
 *
 * @param {Object} options - Configuration options for the composable
 * @param {|Object} options.queryParams - Reactive or static query parameters object
 * @param {string} [options.queryParams.date_updated__lte] - Filter for submissions updated
 *                                                           on or before this date (ISO string)
 * @param {string} [options.queryParams.date_updated__gte] - Filter for submissions updated on or
 *                                                           after this date (ISO string)
 * @param {string} [options.queryParams.lastRead] - Timestamp of when notifications were last read,
 *                                                  if lastRead is more recent than
 *                                                  date_updated__gte, it will be used instead
 * @param {string} [options.queryParams.status__in] - Comma-separated list of submission statuses to
 *                                                    filter by (e.g., "PENDING,APPROVED")
 * @param {string} [options.queryParams.keywords] - Search keywords to filter submissions
 *                                                  by channel name
 *
 *
 * @typedef {Object} UseCommunityLibraryUpdatesObject
 * @property {import('vue').ComputedRef<Array>} returns.submissionsUpdates - Array of transformed
 *                                             submission updates/notifications
 * @property {import('vue').ComputedRef<boolean>} returns.isLoading - True when loading initial data
 * @property {import('vue').ComputedRef<boolean>} returns.isLoadingMore True when loading more data
 * @property {import('vue').ComputedRef<boolean>} returns.hasMore - True when more pages are
 *                                               available to load
 * @property {Function} returns.fetchData - Function to fetch fresh data (resets pagination)
 * @property {Function} returns.fetchMore - Function to fetch the next page of data
 *
 *
 * @returns {UseCommunityLibraryUpdatesObject} The composable return object
 */
export default function useCommunityLibraryUpdates({ queryParams } = {}) {
  const moreObject = ref(null);
  const isLoadingMore = ref(false);
  const { createSnackbar } = useSnackbar();
  /**
   * Community Library Submissions are objects that may represent two types of updates:
   * 1. Creation of a new submission (status: PENDING or SUPERSEDED)
   * 2. Status update (status: REJECTED, APPROVED, LIVE)
   * If the submission is in a status other than PENDING or SUPERSEDED, it means an update has
   * happened apart from creation, so we need to create two updates for that submission.
   *
   * Additionally, since backend filters only filter by `date_updated`, and this corresponds to
   * the last update (not creation), we need to re-apply the date filters and sorting after
   * transforming the submissions into updates.
   *
   * @param {*} submissions Array of submissions returned from the backend.
   */
  const getSubmissionsUpdates = (submissions = []) => {
    let updates = [];
    for (const submission of submissions) {
      const sub = {
        ...submission,
        date_created: new Date(submission.date_created),
        date_updated: submission.date_updated && new Date(submission.date_updated),
      };

      // If the status is not PENDING or SUPERSEDED, it means there is also a status update
      const hasUpdate = ![
        CommunityLibraryStatus.PENDING,
        CommunityLibraryStatus.SUPERSEDED,
      ].includes(sub.status);

      // Always add creation update
      updates.push({
        ...sub,
        // If it has updates, it means the current status is not the initial creation status
        status: hasUpdate ? CommunityLibraryStatus.PENDING : sub.status,
        type: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED,
        date: sub.date_created,
      });

      if (hasUpdate) {
        updates.push({
          ...sub,
          type: statusToNotificationType[sub.status],
          date: sub.date_updated,
        });
      }
    }

    const params = unref(queryParams);
    // Apply date filters again, since creation updates may not be filtered yet
    updates = updates.filter(update => {
      if (params?.date_updated__lte) {
        const lteDate = new Date(params.date_updated__lte);
        if (update.date > lteDate) {
          return false;
        }
      }
      if (params?.date_updated__gte) {
        const gteDate = new Date(params.date_updated__gte);
        if (update.date < gteDate) {
          return false;
        }
      }
      if (params?.status__in) {
        const statusList = params.status__in.split(',');
        const notificationTypes = statusList.map(status => statusToNotificationType[status]);
        if (!notificationTypes.includes(update.type)) {
          return false;
        }
      }
      return true;
    });

    // Since we are combining multiple updates per submission, we need to sort them again
    updates.sort((a, b) => b.date - a.date);

    return updates;
  };

  const getNewerDate = (date1, date2) => {
    if (!date1) {
      return date2;
    }
    if (!date2) {
      return date1;
    }
    return new Date(date1) > new Date(date2) ? date1 : date2;
  };

  const fetchSubmissionsUpdates = async () => {
    let params;
    isLoadingMore.value = Boolean(moreObject.value);
    if (isLoadingMore.value) {
      params = moreObject.value;
    } else {
      const _params = unref(queryParams);
      params = pickBy({
        date_updated__lte: _params?.date_updated__lte,
        date_updated__gte: getNewerDate(_params?.date_updated__gte, _params?.lastRead),
        status__in: _params?.status__in,
        search: _params?.keywords,
        max_results: MAX_RESULTS_PER_PAGE,
      });
    }
    const wasLoadingMore = isLoadingMore.value;
    try {
      const response = await CommunityLibrarySubmission.fetchCollection(params);

      // Transforming submissions into updates before concatenation with existing updates
      // for performance reasons
      response.results = getSubmissionsUpdates(response.results);
      if (wasLoadingMore) {
        response.results = [...submissionsUpdates.value, ...response.results];
      }
      moreObject.value = response.more;
      isLoadingMore.value = false;
      return response.results;
    } catch (error) {
      const returnedResults = wasLoadingMore ? submissionsUpdates.value : [];
      isLoadingMore.value = false;
      createSnackbar(commonStrings.genericErrorMessage$());
      // Do not manage any error state in the useFetch composable, just return the current results
      return returnedResults;
    }
  };

  const {
    isLoading: _isLoading,
    data: _submissionsUpdates,
    fetchData: _fetchData,
  } = useFetch({
    asyncFetchFunc: fetchSubmissionsUpdates,
  });
  const submissionsUpdates = computed(() => _submissionsUpdates.value || []);

  // Differentiate between initial loading and loading more
  const isLoading = computed(() => !isLoadingMore.value && _isLoading.value);
  const hasMore = computed(() => Boolean(moreObject.value));

  const fetchData = () => {
    // Reset the moreObject when doing a fresh fetch
    moreObject.value = null;
    return _fetchData();
  };
  // Fetch more does not reset the moreObject
  const fetchMore = () => _fetchData();

  return {
    hasMore,
    submissionsUpdates,
    isLoading,
    isLoadingMore,
    fetchData,
    fetchMore,
  };
}
