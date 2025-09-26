import { useFetch } from '../../../../composables/useFetch';
import { CommunityLibrarySubmission } from 'shared/data/resources';

export function useCommunityLibrarySubmissions(channelId) {
  return useFetch({
    asyncFetchFunc: () => CommunityLibrarySubmission.fetchCollection({ channel: channelId }),
  });
}
