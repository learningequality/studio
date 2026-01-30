import { CommunityLibraryStatus } from 'shared/constants';

export const getUiSubmissionStatus = status => {
  // We do not need to distinguish LIVE from APPROVED in many parts of the UI
  // nor SUPERSEDED from PENDING
  const uiStatusMap = {
    [CommunityLibraryStatus.LIVE]: CommunityLibraryStatus.APPROVED,
    [CommunityLibraryStatus.SUPERSEDED]: CommunityLibraryStatus.PENDING,
  };
  return uiStatusMap[status] || status;
};
