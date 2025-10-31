import { createTranslator } from 'shared/i18n';

export const communityChannelsStrings = createTranslator('CommunityChannelsStrings', {
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
  modeLive: {
    message: 'Live',
    context: 'Label to select live publishing mode',
  },
  modeDraft: {
    message: 'Draft (staging)',
    context: 'Label to select draft publishing mode',
  },
  versionNotesLabel: {
    message: "Describe what's new in this channel version",
    context: 'Label for the version notes text area',
  },
  versionDescriptionLabel: {
    message: 'Version description',
    context: 'Label for the version description text area',
  },
  modeLiveDescription: {
    message: 'This edition will be accessible to the public through the Kolibri public library.',
    context: 'Description for the live publishing mode',
  },
  modeDraftDescription: {
    message:
      'Your channel will be saved as a draft, allowing you to review or conduct quality checks without altering the published version on Kolibri public library.',
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
  incompleteResourcesDescription2: {
    message: "Click 'Publish' to confirm that you would like to publish anyway.",
    context: 'Confirmation message for publishing incomplete resources',
  },
  cancelAction: {
    message: 'Cancel',
    context: 'The action button to cancel an ongoing operation',
  },
  languageLabel: {
    message: 'Language',
    context: 'Label for the language selection dropdown',
  },
  languageRequiredMessage: {
    message: 'Language is required',
    context: 'Error message when language selection is required',
  },
  pendingStatus: {
    message: 'Submitted',
    context: 'Status indicating that an Community Library submission is pending',
  },
  approvedStatus: {
    message: 'Approved',
    context: 'Status indicating that an Community Library submission is approved',
  },
  flaggedStatus: {
    message: 'Flagged',
    context: 'Status indicating that an Community Library submission is rejected',
  },
  // Submit to Community Library panel strings
  submitToCommunityLibrary: {
    message: 'Submit to Community Library',
    context: 'The title of the "Submit to Community Library" panel',
  },
  submittedPrimaryInfo: {
    message:
      'A previous version is still pending review. Reviewers will see the latest submission first.',
    context:
      'Information shown in the "Submit to Community Library" panel when a previous version is pending review',
  },
  approvedPrimaryInfo: {
    message:
      'A previous version is live in the Community Library. Reviewers will see the latest submission first.',
    context:
      'Information shown in the "Submit to Community Library" panel when a previous version is approved and live',
  },
  flaggedPrimaryInfo: {
    message:
      'A previous version was flagged for review. Ensure you have fixed all highlighted issues before submitting.',
    context:
      'Information shown in the "Submit to Community Library" panel when a previous version was flagged',
  },
  nonePrimaryInfo: {
    message: 'Your published channel will be added to the Community Library review queue.',
    context:
      'Information shown in the "Submit to Community Library" panel when there are no previous submissions',
  },
  moreDetailsButton: {
    message: 'More details',
    context:
      'Button in the "Submit to Community Library" panel to show more details about the Community Library',
  },
  lessDetailsButton: {
    message: 'Less details',
    context:
      'Button in the "Submit to Community Library" panel to hide details about the Community Library',
  },
  moreDetails: {
    message:
      "The Kolibri Community Library features channels created by the community. Share your openly licensed work for review, and once it's approved, it will be available to users in your selected region or language.",
    context:
      'Detailed description of the Community Library shown in the "Submit to Community Library" panel',
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
    message: 'This channel is currently public in the Content Library.',
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
      'Please wait for review or make changes and publish a new version before submitting again.',
    context:
      'Description of warning shown in the "Submit to Community Library" panel when the current version is already submitted',
  },
  descriptionLabel: {
    message: "Describe what's new in this submission",
    context:
      'Label for the submission description field in the "Submit to Community Library" panel',
  },
  descriptionRequired: {
    message: 'Description is required',
    context:
      'Error message shown in the "Submit to Community Library" panel when description is required but empty',
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
    message: 'Country',
    context: 'Label for the country selection field in the "Submit to Community Library" panel',
  },
  languagesDetected: {
    message: 'Language(s) detected',
    context: 'Label for detected languages in the "Submit to Community Library" panel',
  },
  licensesDetected: {
    message: 'License(s) detected',
    context: 'Label for detected licenses in the "Submit to Community Library" panel',
  },
  categoriesDetected: {
    message: 'Categories',
    context: 'Label for detected categories in the "Submit to Community Library" panel',
  },
  confirmReplacementText: {
    message: 'I understand this will replace my earlier submission on the review queue',
    context: 'Checkbox text shown when there is a pending submission to confirm replacement',
  },
});
