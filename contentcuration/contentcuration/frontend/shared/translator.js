import { createTranslator } from 'shared/i18n';

const MESSAGES = {
  titleRequired: 'Title is required',
  licenseRequired: 'License is required',
  copyrightHolderRequired: 'Copyright holder is required',
  licenseDescriptionRequired: 'Special permissions license must have a description',
  masteryModelRequired: 'Mastery is required',
  masteryModelMRequired: 'Required',
  masteryModelMGtZero: 'Must be at least 1',
  masteryModelMWholeNumber: 'Must be a whole number',
  masteryModelMLteN: 'Must be lesser than or equal to N',
  masteryModelNRequired: 'Required',
  masteryModelNGtZero: 'Must be at least 1',
  masteryModelNWholeNumber: 'Must be a whole number',
  confirmLogout: 'Changes you made may not be saved. Are you sure you want to leave this page?',
  learningActivityRequired: 'Learning activity is required',
  durationRequired: 'Duration is required',
  activityDurationRequired: 'This field is required',
  shortActivityGteOne: 'Short activity must be greater than or equal to 1',
  shortActivityLteThirty: 'Short activity must be less than or equal to 30',
  longActivityGtThirty: 'Long activity must be greater than 30',
  longActivityLteOneTwenty: 'Long activity must be less than or equal to 120',
  activityDurationTimeMinRequirement: 'Time must be greater than or equal to 1',
  activityDurationTooLongWarning:
    'Please make sure this is the amount of time you want learners to spend on this resource to complete it',
};

export default createTranslator('sharedVue', MESSAGES);
