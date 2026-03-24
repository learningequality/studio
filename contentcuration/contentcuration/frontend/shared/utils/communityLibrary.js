import { CommunityLibraryResolutionReason, CommunityLibraryStatus } from 'shared/constants';
import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

export const getUiSubmissionStatus = status => {
  // We do not need to distinguish LIVE from APPROVED in many parts of the UI
  // nor SUPERSEDED from PENDING
  const uiStatusMap = {
    [CommunityLibraryStatus.LIVE]: CommunityLibraryStatus.APPROVED,
    [CommunityLibraryStatus.SUPERSEDED]: CommunityLibraryStatus.PENDING,
  };
  return uiStatusMap[status] || status;
};

export const getResolutionReasonLabel = reason => {
  const {
    invalidLicensingReason$,
    qualityAssuranceReason$,
    invalidMetadataReason$,
    portabilityIssuesReason$,
    otherIssuesReason$,
  } = communityChannelsStrings;

  const reasonLabelMap = {
    [CommunityLibraryResolutionReason.INVALID_LICENSING]: invalidLicensingReason$(),
    [CommunityLibraryResolutionReason.TECHNICAL_QUALITY_ASSURANCE]: qualityAssuranceReason$(),
    [CommunityLibraryResolutionReason.INVALID_METADATA]: invalidMetadataReason$(),
    [CommunityLibraryResolutionReason.PORTABILITY_ISSUES]: portabilityIssuesReason$(),
    [CommunityLibraryResolutionReason.OTHER]: otherIssuesReason$(),
  };

  return reasonLabelMap[reason] || reason;
};
