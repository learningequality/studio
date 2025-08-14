import { createTranslator } from 'shared/i18n';

export const communityChannelsStrings = createTranslator('CommunityChannelsStrings', {
  // Publishing panel strings
  publishChannel: {
    message: 'Publish channel',
  },
  publishLive: {
    message: 'PUBLISH',
  },
  saveDraft: {
    message: 'SAVE DRAFT',
  },
  modeLive: {
    message: 'Live',
  },
  modeDraft: {
    message: 'Draft (staging)',
  },
  versionNotesLabel: {
    message: "Describe what's new in this channel version",
  },
  modeLiveDescription: {
    message: 'This edition will be accessible to the public through the Kolibri public library.',
  },
  modeDraftDescription: {
    message:
      'Your channel will be saved as a draft, allowing you to review or conduct quality checks without altering the published version on Kolibri public library.',
  },
  publishingInfo: {
    message: "You're publishing: Version {version} ({time})",
  },
  incompleteResourcesWarning: {
    message: '{count} incomplete resources.',
  },
  incompleteResourcesDescription: {
    message:
      "Incomplete resources will not be published and made available for download in Kolibri. Click 'Publish' to confirm that you would like to publish anyway.",
  },
  maxLengthError: {
    message: 'Maximum 250 characters allowed',
  },
  cancel: {
    message: 'CANCEL',
  },
  languageLabel: {
    message: 'Language',
  },
  languageRequiredMessage: {
    message: 'Language is required',
  },
});
