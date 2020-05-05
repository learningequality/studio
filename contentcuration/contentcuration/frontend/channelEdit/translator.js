import { createTranslator } from 'shared/i18n';

const NAMESPACE = 'channelEditVue';
const MESSAGES = {
  true: 'True',
  false: 'False',
  questionTypeSingleSelection: 'Single selection',
  questionTypeMultipleSelection: 'Multiple selection',
  questionTypeTrueFalse: 'True/False',
  questionTypeInput: 'Input question',
  errorQuestionRequired: 'Question cannot be blank',
  errorMissingAnswer: 'Choose a correct answer',
  errorChooseAtLeastOneCorrectAnswer: 'Choose at least one correct answer',
  errorProvideAtLeastOneCorrectAnswer: 'Provide at least one correct answer',
};

export default createTranslator(NAMESPACE, MESSAGES);
