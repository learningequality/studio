import { createTranslator } from 'shared/i18n';

const MESSAGES = {
  fieldRequired: 'This field is required',
  fieldHasError: 'This field has an error',
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
  activityDurationGteOne: 'Value must be equal to or greater than 1',
  shortActivityLteThirty: 'Value must be equal or less than 30',
  longActivityGtThirty: 'Value must be greater than 30',
  longActivityLteOneTwenty: 'Value must be equal or less than 120',
  activityDurationTooLongWarning:
    'This value is very high. Please make sure this is how long learners should work on the resource for, in order to complete it.',
  changesSaved: 'Changes saved',
  addAdditionalCatgoriesDescription:
    'You selected resources that have different categories. The categories you choose below will be added to all selected resources. This will not remove existing categories.',
};

export default createTranslator('sharedVue', MESSAGES);
