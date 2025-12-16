import { ref, computed, unref } from 'vue';
import pickBy from 'lodash/pickBy';
import { useFetch } from 'shared/composables/useFetch';
import { CommunityLibrarySubmission } from 'shared/data/resources';
import { CommunityLibraryStatus, NotificationType } from 'shared/constants';

const MAX_RESULTS_PER_PAGE = 10;

const statusToNotificationType = {
  [CommunityLibraryStatus.PENDING]: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED,
  [CommunityLibraryStatus.SUPERSEDED]: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED,
  [CommunityLibraryStatus.REJECTED]: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_REJECTED,
  [CommunityLibraryStatus.APPROVED]: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_APPROVED,
  [CommunityLibraryStatus.LIVE]: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_APPROVED,
};

export default function useCommunityLibraryUpdates({ queryParams } = {}) {
  const moreObject = ref(null);
  const isLoadingMore = ref(false);

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
      submission.date_created = new Date(submission.date_created);
      submission.date_updated = submission.date_updated && new Date(submission.date_updated);

      // Always add creation update
      updates.push({
        ...submission,
        type: NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED,
        date: submission.date_created,
      });

      // If the status is not PENDING or SUPERSEDED, it means there is also a status update
      if (
        ![CommunityLibraryStatus.PENDING, CommunityLibraryStatus.SUPERSEDED].includes(
          submission.status,
        )
      ) {
        updates.push({
          ...submission,
          type: statusToNotificationType[submission.status],
          date: submission.date_updated,
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
    updates.sort((a, b) => new Date(b.date) - new Date(a.date));

    return updates;
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
        date_updated__gte: _params?.date_updated__gte,
        status__in: _params?.status__in,
        search: _params?.keywords,
        max_results: MAX_RESULTS_PER_PAGE,
      });
    }
    const response = await CommunityLibrarySubmission.fetchCollection(params);

    // Transforming submissions into updates before concatenation for
    // performance reasons
    response.results = getSubmissionsUpdates(response.results);
    if (isLoadingMore.value) {
      response.results = [...submissionsUpdates.value, ...response.results];
    }
    moreObject.value = response.more;
    isLoadingMore.value = false;
    return response.results;
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
