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
});
