/*
  Vueified exercise creation localization strings that
  are needed in non-component files (utils, constants..)
*/
import i18n from '../../utils/i18n';

const NAMESPACE = 'exerciseCreationVue';
const MESSAGES = {
  true: 'True',
  false: 'False',
  questionTypeSingleSelection: 'Single selection',
  questionTypeMultipleSelection: 'Multiple selection',
  questionTypeTrueFalse: 'True/False',
  questionTypeInput: 'Input question',
  errorBlankQuestion: 'Question cannot be blank',
  errorMissingAnswer: 'Choose a correct answer',
  errorChooseAtLeastOneCorrectAnswer: 'Choose at least one correct answer',
  errorProvideAtLeastOneCorrectAnwer: 'Provide at least one correct answer',
};

const translate = i18n.createTranslator(NAMESPACE, MESSAGES);

export default { translate };
