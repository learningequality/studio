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
};

export default createTranslator('sharedVue', MESSAGES);
