import { createTranslator } from 'shared/i18n';

export const communityChannelsStrings = createTranslator('CommunityChannelsStrings', {
  communityLibraryLabel: {
    message: 'Community Library',
    context: 'Label for the Community Library',
  },
  // Publishing panel strings
  publishChannel: {
    message: 'Publish channel',
    context: 'The title of the panel to publish a channel',
  },
  publishAction: {
    message: 'Publish',
    context: 'The action button to publish a channel',
  },
  saveDraft: {
    message: 'Save draft',
    context: 'The action button to save a channel as a draft',
  },
  publishChannelMode: {
    message: 'Publish channel',
    context: 'Label to select live publishing mode',
  },
  publishDraftMode: {
    message: 'Publish draft channel',
    context: 'Label to select draft publishing mode',
  },
  versionNotesLabel: {
    message: "Describe what's included in this channel version",
    context: 'Label for the version notes text area',
  },
  versionDescriptionLabel: {
    message: 'Version description',
    context: 'Label for the version description text area',
  },
  publishChannelDescription: {
    message: 'To see your channel in Kolibri, import using the channel token.',
    context: 'Description for the live publishing mode',
  },
  publishDraftDescription: {
    message:
      'Your channel will be saved as a draft, allowing you to review and do quality checks on the draft, without altering the current version available for Kolibri users. To see this draft channel in Kolibri, import using the draft channel token.',
    context: 'Description for the draft publishing mode',
  },
  publishingInfo: {
    message: "You're publishing: Version {version}",
    context: 'Information about the version being published',
  },
  channelVersion: {
    message: '{name} v{version}',
    context: 'Formatted channel title that includes the channel name and its version;',
  },
  incompleteResourcesWarning: {
    message:
      '{count, number} {count, plural, one {incomplete resource} other {incomplete resources}}',
    context: 'Warning about incomplete resources',
  },
  incompleteResourcesDescription1: {
    message:
      'Incomplete resources will not be published and made available for download in Kolibri.',
    context: 'Description for incomplete resources',
  },
  cancelAction: {
    message: 'Cancel',
    context: 'The action button to cancel an ongoing operation',
  },
  languageLabel: {
    message: 'Language',
    context: 'Label for the language selection dropdown',
  },
  // Channel version history strings
  seeAllVersions: {
    message: 'See all versions',
    context: 'Button text to expand and show channel version history',
  },
  hideVersions: {
    message: 'Hide versions',
    context: 'Button text to collapse channel version history',
  },
  showMore: {
    message: 'Show more',
    context: 'Button text to load more channel versions',
  },
  versionLabel: {
    message: 'Version {version}',
    context: 'Label displaying a channel version number',
  },
  errorLoadingVersions: {
    message: 'Unable to load version history',
    context: 'Error message when channel versions fail to load',
  },
  noVersionsAvailable: {
    message: 'No version history available',
    context: 'Message shown when channel has no published versions',
  },
  retry: {
    message: 'Retry',
    context: 'Button text to retry loading more versions after an error',
  },
  loadingVersionHistory: {
    message: 'Loading version history',
    context: 'Aria label for screen readers when version history is loading',
  },
  pendingStatus: {
    message: 'Submitted',
    context: 'Status indicating that a Community Library submission is pending',
  },
  supersededStatus: {
    message: 'Superseded',
    context:
      'Status indicating that a Community Library submission is superseded by a newer submission',
  },
  approvedStatus: {
    message: 'Approved',
    context: 'Status indicating that a Community Library submission is approved',
  },
  flaggedStatus: {
    message: 'Needs changes',
    context: 'Status indicating that a Community Library submission is rejected',
  },
  availableStatus: {
    message: 'Available in Community Library',
    context:
      'Status indicating that a Community Library submission is now available in the Community Library',
  },
  // Submit to Community Library panel strings
  submitToCommunityLibrary: {
    message: 'Submit to Community Library',
    context: 'The title of the "Submit to Community Library" panel',
  },
  publishingMessage: {
    message: 'Channel is being published',
    context:
      'Shown in the Submit to Community Library side panel when the channel is currently publishing',
  },
  submittedPrimaryInfo: {
    message:
      'A previous version is still pending review. Reviewers will see the most recent submission by default.',
    context:
      'Information shown in the "Submit to Community Library" panel when a previous version is pending review',
  },
  approvedPrimaryInfo: {
    message:
      'A previous version is live in the Community Library. Reviewers will see the latest submission first.',
    context:
      'Information shown in the "Submit to Community Library" panel when a previous version is approved and live',
  },
  needsChangesPrimaryInfo: {
    message:
      'Your previously submitted version needs changes. Make sure you have addressed all comments before resubmitting.',
    context:
      'Information shown in the "Submit to Community Library" panel when a previous version was not approved by an admin and requires changes.',
  },
  nonePrimaryInfo: {
    message:
      "We're inviting members of the Kolibri community to submit channels they've created for offline learning in low-resource settings. ",
    context:
      'Information shown in the "Submit to Community Library" panel when there are no previous submissions',
  },
  moreDetailsButton: {
    message: 'More details',
    context:
      'Button in the "Submit to Community Library" panel to show more details about the Community Library',
  },
  lessDetailsButton: {
    message: 'Hide details',
    context:
      'Button in the "Submit to Community Library" panel to hide details about the Community Library',
  },
  moreDetails: {
    message:
      "After your submission is approved, the channel will be available to other Kolibri Studio users on the 'Community Library' page.",
    context:
      'Detailed description of the Community Library shown in the "Submit to Community Library" panel',
  },
  countriesInfoText: {
    message:
      'Select one or more countries to label your channel submission with. For example, if your channel contains materials aligned to a national curriculum or regionally-specific content, selecting the relevant countries will help users find it. Otherwise, leave this blank.',
    context: 'Help text for the country selection field in the "Submit to Community Library" panel',
  },
  notPublishedWarningTitle: {
    message: "This channel isn't published to Kolibri Studio yet",
    context:
      'Title of warning shown in the "Submit to Community Library" panel when the channel is not published',
  },
  notPublishedWarningDescription: {
    message: 'Publish to Studio first, then submit to the Community Library.',
    context:
      'Description of warning shown in the "Submit to Community Library" panel when the channel is not published',
  },
  publicWarningTitle: {
    message: 'This channel is currently public in the Kolibri Library.',
    context:
      'Title of warning shown in the "Submit to Community Library" panel when the channel is public',
  },
  publicWarningDescription: {
    message: 'It is not possible to submit public channels to the Community Library.',
    context:
      'Description of warning shown in the "Submit to Community Library" panel when the channel is public',
  },
  alreadySubmittedWarningTitle: {
    message: 'This version of the channel has already been submitted to the Community Library.',
    context:
      'Title of warning shown in the "Submit to Community Library" panel when the current version is already submitted',
  },
  alreadySubmittedWarningDescription: {
    message:
      'Please wait for the channel to be reviewed. You will see a notification in your Studio account after the review is complete.',
    context:
      'Description of warning shown in the "Submit to Community Library" panel when the current version is already submitted',
  },
  descriptionLabel: {
    message: "Describe what's included in this submission",
    context:
      'Label for the submission description field in the "Submit to Community Library" panel',
  },
  submitButton: {
    message: 'Submit for review',
    context: 'Button in the "Submit to Community Library" panel to submit channel for review',
  },
  submittingSnackbar: {
    message: 'Submitting channel to Community Library...',
    context: 'Snackbar message shown while submitting from the "Submit to Community Library" panel',
  },
  submittedSnackbar: {
    message: 'Channel submitted to Community Library',
    context:
      'Snackbar message shown after successful submission from the "Submit to Community Library" panel',
  },
  errorSnackbar: {
    message: 'There was an error submitting the channel',
    context:
      'Snackbar message shown when submission fails from the "Submit to Community Library" panel',
  },
  countryLabel: {
    message: 'Countries',
    context: 'Label for the country selection field in the "Submit to Community Library" panel',
  },
  languagesLabel: {
    message: 'Languages',
    context: 'Label for detected languages in the "Submit to Community Library" panel',
  },
  licensesLabel: {
    message: 'Licenses',
    context: 'Label for detected licenses in the "Submit to Community Library" panel',
  },
  categoriesLabel: {
    message: 'Categories',
    context: 'Label for detected categories in the "Submit to Community Library" panel',
  },
  submissionNotesLabel: {
    message: 'Submission notes',
    context: 'Label for the notes the editor can add to their submission to the Community Library',
  },
  feedbackNotesLabel: {
    message: 'Notes from the reviewer',
    context:
      'Label for the feedback notes that reviewers can add to a submission in the Community Library ',
  },
  internalNotesLabel: {
    message: 'Admin notes (internal use only)',
    context:
      'Label for the notes that admins can add to a submission in the Community Library for themselves',
  },
  channelFitLicenseLabel: {
    message: 'License',
    context: 'Label for the license checklist item in the channel fit checklist',
  },
  channelFitOfflineUseLabel: {
    message: 'Offline use',
    context: 'Label for the offline use checklist item in the channel fit checklist',
  },
  channelFitAttributionLabel: {
    message: 'Attribution',
    context: 'Label for the attribution checklist item in the channel fit checklist',
  },
  channelFitQualityLabel: {
    message: 'Quality',
    context: 'Label for the quality checklist item in the channel fit checklist',
  },
  channelFitChannelInfoLabel: {
    message: 'Channel information',
    context: 'Label for the channel information checklist item in the channel fit checklist',
  },
  channelFitChecklistIntro: {
    message: 'Criteria for submitting to the Community Library',
    context:
      'Introductory text before a checklist of criteria for submitting a channel to the Community Library',
  },
  viewCriteriaAction: {
    message: 'View criteria',
    context: 'Button text to view the channel fit checklist criteria',
  },
  hideCriteriaAction: {
    message: 'Hide criteria',
    context: 'Button text to hide the channel fit checklist criteria',
  },
  channelFitChecklistLicense: {
    message: 'Are the resources in your channel openly licensed or in the public domain?',
    context:
      'License checklist item asking whether the channel content uses open or public domain licenses',
  },
  channelFitChecklistOfflineUse: {
    message: 'Do the resources in your channel work without an Internet connection?',
    context: 'Offline use checklist item asking whether the channel works offline',
  },
  channelFitChecklistAttribution: {
    message: 'Does each resource have an author listed?',
    context: 'Attribution checklist item asking whether content items have authors listed',
  },
  channelFitChecklistQuality: {
    message: 'Has anyone on your team or in your organization reviewed the channel?',
    context:
      'Quality checklist item asking whether the channel has been reviewed and validated by someone on the team',
  },
  channelFitChecklistChannelInfo: {
    message:
      "Is your channel's basic information filled in — title, description, thumbnail, language, category, and level?",
    context: 'Channel information checklist item asking whether the channel metadata is complete',
  },
  confirmReplacementText: {
    message: 'I understand this will replace my earlier submission on the review queue',
    context: 'Checkbox text shown when there is a pending submission to confirm replacement',
  },
  resubmitModalTitle: {
    message: 'Resubmit channel for Community library review?',
    context:
      'Title of the modal shown after publishing a channel that already has Community Library submissions',
  },
  resubmitModalBodyFirst: {
    message: '{channelName} v{version} is also published to the Community Library.',
    context:
      'First sentence of the body text of the modal shown after publishing a channel that already has Community Library submissions',
  },
  resubmitModalBodySecond: {
    message:
      'Would you like to resubmit this version with your changes for Community Library review?',
    context:
      'Second sentence of the body text of the modal shown after publishing a channel that already has Community Library submissions',
  },
  resubmitAction: {
    message: 'Resubmit',
    context: 'Action in the resubmit modal to open the submit to Community Library side panel',
  },
  dismissAction: {
    message: 'Dismiss',
    context: 'Action in the resubmit modal to dismiss the modal',
  },
  licenseCheckPassed: {
    message: 'License check passed.',
    context: 'Title shown when license audit passes (no invalid licenses found)',
  },
  allLicensesCompatible: {
    message: 'All licenses are compatible with Community Library.',
    context: 'Message shown after listing compatible licenses when license check passes',
  },
  incompatibleLicensesDetected: {
    message: 'Incompatible licenses detected.',
    context: 'Title shown when invalid licenses are detected in the channel',
  },
  channelCannotBeDistributed: {
    message: 'This channel cannot be distributed via Kolibri.',
    context: 'Message explaining that channels with incompatible licenses cannot be distributed',
  },
  fixLicensingBeforeSubmission: {
    message: 'Please fix licensing before submitting a new version.',
    context: 'Call to action message when incompatible licenses are detected',
  },
  incompatibleLicensesDescription: {
    message:
      '"{licenseNames}" - this channel cannot be distributed via Kolibri.  If you cannot change the license, remove all resources with "{licenseNames}"  before submitting again.',
    context:
      'Description shown when incompatible licenses are detected, includes the license names and explanation',
  },
  compatibleLicensesDescription: {
    message: '{licenseNames} - All licenses are compatible with Community Library.',
    context:
      'Description shown when all licenses are compatible, includes the license names and confirmation message',
  },
  specialPermissionsDetected: {
    message: 'Special Permissions licenses detected',
    context: 'Title shown when special permissions licenses are detected in the channel',
  },
  confirmDistributionRights: {
    message: 'Please confirm you have the right to distribute these resources via Kolibri.',
    context:
      'Message asking user to confirm they have distribution rights for special permissions content',
  },
  previousPageAction: {
    message: 'Previous',
    context: 'Button text to navigate to the previous page in pagination',
  },
  nextPageAction: {
    message: 'Next',
    context: 'Button text to navigate to the next page in pagination',
  },
  pageIndicator: {
    message: '{currentPage} of {totalPages}',
    context: 'Page indicator showing current page and total pages (e.g., "1 of 5")',
  },

  // Notifications modal strings
  notificationsLabel: {
    message: 'Notifications',
    context: 'Label for the notifications modal',
  },
  unreadNotificationsLabel: {
    message: 'Unread',
    context: 'Label for the unread notifications tab in the notifications modal',
  },
  allNotificationsLabel: {
    message: 'All Notifications',
    context: 'Label for the all notifications tab in the notifications modal',
  },
  searchNotificationsLabel: {
    message: 'Search notifications',
    context: 'Placeholder text for the search notifications input field',
  },
  filterByDateLabel: {
    message: 'Filter by date',
    context: 'Label for the filter by date dropdown in the notifications modal',
  },
  todayLabel: {
    message: 'Today',
    context: 'Option label for filtering notifications from today',
  },
  thisWeekLabel: {
    message: 'This week',
    context: 'Option label for filtering notifications from this week',
  },
  thisMonthLabel: {
    message: 'This month',
    context: 'Option label for filtering notifications from this month',
  },
  thisYearLabel: {
    message: 'This year',
    context: 'Option label for filtering notifications from this year',
  },
  filterByStatusLabel: {
    message: 'Filter by status',
    context: 'Label for the filter by status dropdown in the notifications modal',
  },
  newLabel: {
    message: 'New',
    context: 'Label indicating the section for new notifications',
  },
  clearAllAction: {
    message: 'Clear all',
    context: 'Action button to clear all notifications',
  },
  viewMoreAction: {
    message: 'View more',
    context: 'Action button to view more about a given element',
  },
  submissionCreationNotification: {
    message: 'Your submission to the Community Library was successful and is now under review.',
    context:
      'Notification message shown to the user when their submission to the Community Library is successful',
  },
  flaggedNotification: {
    message: 'Changes required for version {channelVersion}',
    context: 'Notification message shown when a user flags a channel version for review',
  },
  submissionNotification: {
    message: '{author} ({userType}) submitted {channelVersion}',
    context: 'Notification message shown when a user submits a channel version for review',
  },
  approvedNotification: {
    message: '{author} ({userType}) approved {channelVersion}',
    context: 'Notification message shown when a user approves a channel version',
  },
  showOlderAction: {
    message: 'Show older',
    context: 'Action button to load older items in a list',
  },
  adminLabel: {
    message: 'Admin',
    context: 'Label indicating administrative status',
  },
  editorLabel: {
    message: 'Editor',
    context: 'Label indicating editor status',
  },
  emptyNotificationsNotice: {
    message: 'You have no notifications at this time.',
    context: 'Notice shown when there are no notifications to display',
  },
  emptyNotificationsWithFiltersNotice: {
    message: 'No notifications match the applied filters.',
    context: 'Notice shown when no notifications match the current filters',
  },
  newNotificationsNotice: {
    message: 'New notifications available.',
    context:
      'Notice for screen readers on the new notifications badge to indicate that new notifications have arrived',
  },
  communityLibrarySubmissionLabel: {
    message: 'Community Library submission',
    context: 'Label for notifications related to Community Library submissions',
  },
  channelVersionTokenLabel: {
    message: 'Channel version token',
    context: 'Label for the channel version token included in submission details page',
  },
  publishedVersionLabel: {
    message: 'Published version:',
    context: 'Label indicating the live version of a channel',
  },
  activityHistoryLabel: {
    message: 'Activity history',
    context: 'Label for the activity history section in the submission details page',
  },

  // Resolution reasons strings
  reasonLabel: {
    message: 'Reason: {reason}',
    context: 'Label for the reason provided for a given action (e.g., rejection reason)',
  },
  invalidLicensingReason: {
    message: 'Invalid or non-compliant licenses',
    context: 'Rejection reason indicating that the channel has invalid or non-compliant licenses',
  },
  qualityAssuranceReason: {
    message: 'Quality assurance issues',
    context: 'Rejection reason indicating that the channel has quality assurance issues',
  },
  invalidMetadataReason: {
    message: 'Invalid or missing metadata',
    context: 'Rejection reason indicating that the channel has invalid or missing metadata',
  },
  portabilityIssuesReason: {
    message: 'Portability problems',
    context: 'Rejection reason indicating that the channel has portability problems',
  },
  otherIssuesReason: {
    message: 'Other issues',
    context:
      'Rejection reason indicating that the channel has other issues not covered by other reasons',
  },
  reviewAction: {
    message: 'Review',
    context: 'Action button to review a channel version submission to the Community Library',
  },

  // Draft channel strings
  draftBeingPublishedNotice: {
    message: 'Draft version is being published',
    context: 'Label indicating that a draft version of the channel is currently being published',
  },
  draftPublishedNotice: {
    message: 'Draft published successfully',
    context: 'Label indicating that a draft version of the channel has been successfully published',
  },
  previewYourDraftTitle: {
    message: 'Preview your draft channel in Kolibri',
    context: 'Title for the modal that shows instructions to preview a draft channel in Kolibri',
  },
  channelTokenDescription: {
    message:
      'You can use this token to import and preview the draft channel in Kolibri. Please note that the token for the final published channel will be different.',
    context: 'Description for the channel token field in the draft preview instructions modal',
  },
  getDraftTokenAction: {
    message: 'Copy token for draft channel',
    context:
      'Button text for the action to retrieve the draft token in the draft preview instructions modal',
  },
  draftTokenLabel: {
    message: 'Draft token',
    context: 'Label for the draft token field in the draft preview instructions modal',
  },

  // Community Library List page strings
  communityLibraryDescription: {
    message:
      'Browse community-submitted channels approved for discovery in Studio. Copy a token to use a channel in Kolibri.',
    context: 'Description for the Community Library List page',
  },
  whatIsCommunityLibrary: {
    message: 'What is the Community Library?',
    context:
      'Label for the section explaining what the Community Library is on the Community Library List page',
  },
  resultsText: {
    message: '{count, plural, =1 {# result found} other {# results found}}',
    context: 'Text showing number of results',
  },
  noResultsWithFilters: {
    message: 'No channels match the selected filters.',
    context: 'Message shown when no channels are found with the applied filters',
  },
  noCommunityChannels: {
    message: 'No channels have been published to the Community Library yet.',
    context: 'Message shown when there are no channels in the Community Library',
  },
  loadError: {
    message: 'There was an error loading channels.',
    context: 'Error message when loading channels fails',
  },
  filterLabel: {
    message: 'Filter',
    context: 'Button label to show filters on mobile',
  },
  searchLabel: {
    message: 'Search',
    context: 'Label for the search input',
  },
  clearAll: {
    message: 'Clear all',
    context: 'Button to clear all filters',
  },
  needKolibriVersionToImport: {
    message:
      'You will need Kolibri version 0.19.4 or higher to import channels from the Community Library.',
    context:
      'Message shown in the Community Library List page informing users that they need a certain Kolibri version to import channels from the Community Library',
  },
  communityLibraryCTATitle: {
    message: 'Help grow the Community Library',
    context:
      'Title for the call to action section in the Community Library List page encouraging users to contribute to the Community Library',
  },
  communityLibraryCTADescription: {
    message:
      'Have a channel worth sharing with other educators and learners? Submit it for review through the Share menu so it can be discovered in Studio.',
    context:
      'Description for the call to action section in the Community Library List page encouraging users to contribute to the Community Library',
  },
  goToMyChannelsAction: {
    message: 'Go to My channels',
    context: 'Button text for the action to navigate to the My Channels page',
  },

  // about community library modal
  aboutCommunityLibraryTitle: {
    message: 'About Community Library',
    context: 'Title for the modal that explains what the Community Library is',
  },
  aboutCommunityLibraryDescription: {
    message:
      'Community library contains channels submitted by the community and approved for discovery in Studio.',
    context: 'Description for the modal that explains what the Community Library is',
  },
  whatCanYouDoHere: {
    message: 'What you can do here',
    context:
      'Label for the section before listing the things users can do in the Community Library',
  },
  whatCanYouDoHereItem1: {
    message: 'Browse channels by country, category, and language',
    context: 'First item in the list of things users can do in the Community Library',
  },
  whatCanYouDoHereItem2: {
    message: 'Copy a channel token to use in Kolibri',
    context: 'Second item in the list of things users can do in the Community Library',
  },
  whatCanYouDoHereItem3: {
    message: 'View channel details including description and metadata',
    context: 'Third item in the list of things users can do in the Community Library',
  },
  // gotItLabel: {
  //   message: 'Got it',
  //   context: 'Button text to dismiss the about Community Library modal',
  // },
  // use CLOSE ACTION INSTEAD OF GOT IT TO BE CONSISTENT WITH OTHER MODALS
});
