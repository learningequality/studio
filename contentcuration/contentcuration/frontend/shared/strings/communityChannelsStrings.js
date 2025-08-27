import { createTranslator } from 'shared/i18n';

export const communityChannelsStrings = createTranslator('CommunityChannelsStrings', {
  // Publishing panel strings
  publishChannel: {
    message: 'Publish channel',
  },
  publishLive: {
    message: 'Publish',
  },
  saveDraft: {
    message: 'Save draft',
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
    message: "You're publishing: Version {version}",
  },
  incompleteResourcesWarning: {
    message:
      '{count, number} {count, plural, one {incomplete resource} other {incomplete resources}}.',
  },
  incompleteResourcesDescription1: {
    message:
      'Incomplete resources will not be published and made available for download in Kolibri.',
  },
  incompleteResourcesDescription2: {
    message: "Click 'Publish' to confirm that you would like to publish anyway.",
  },
  cancelAction: {
    message: 'CANCEL',
  },
  languageLabel: {
    message: 'Language',
  },
  languageRequiredMessage: {
    message: 'Language is required',
  },
});
