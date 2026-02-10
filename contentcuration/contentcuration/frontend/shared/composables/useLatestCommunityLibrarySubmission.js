import { useFetch } from './useFetch';
import { AdminCommunityLibrarySubmission, CommunityLibrarySubmission } from 'shared/data/resources';

export function useLatestCommunityLibrarySubmission({ channelId, admin = false }) {
  const Resource = admin ? AdminCommunityLibrarySubmission : CommunityLibrarySubmission;

  function fetchLatestSubmission() {
    // Submissions are ordered by most recent first in the backend
    return Resource.fetchCollection({ channel: channelId, max_results: 1 }).then(response => {
      if (response.results.length > 0) {
        return response.results[0];
      }
      return null;
    });
  }
  return useFetch({
    asyncFetchFunc: fetchLatestSubmission,
  });
}
