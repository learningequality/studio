import { useFetch } from '../../../../composables/useFetch';
import { CommunityLibrarySubmission } from 'shared/data/resources';

export function useLatestCommunityLibrarySubmission(channelId) {
  function fetchLatestSubmission() {
    // Submissions are ordered by most recent first in the backend
    return CommunityLibrarySubmission.fetchCollection({ channel: channelId, max_results: 1 }).then(
      response => {
        if (response.results.length > 0) {
          return response.results[0];
        }
        return null;
      },
    );
  }
  return useFetch({
    asyncFetchFunc: fetchLatestSubmission,
  });
}
