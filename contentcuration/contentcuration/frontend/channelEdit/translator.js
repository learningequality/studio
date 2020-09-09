import { createTranslator } from 'shared/i18n';

const NAMESPACE = 'channelEditVue';

const MESSAGES = {
  true: 'True',
  false: 'False',
  questionTypeSingleSelection: 'Single choice',
  questionTypeMultipleSelection: 'Multiple choice',
  questionTypeTrueFalse: 'True/False',
  questionTypeInput: 'Input question',
  questionTypePerseus: 'Perseus',
  errorQuestionRequired: 'Question is required',
  errorMissingAnswer: 'Choose a correct answer',
  errorChooseAtLeastOneCorrectAnswer: 'Choose at least one correct answer',
  errorProvideAtLeastOneCorrectAnswer: 'Provide at least one correct answer',
};

const VALIDATION_MESSAGES = {
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
};

export default createTranslator(NAMESPACE, { ...MESSAGES, ...VALIDATION_MESSAGES });
