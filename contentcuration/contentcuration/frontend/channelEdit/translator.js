import { createTranslator } from 'shared/i18n';

const NAMESPACE = 'channelEditVue';

const MESSAGES = {
  true: 'True',
  false: 'False',
  questionTypeSingleSelection: 'Single choice',
  questionTypeMultipleSelection: 'Multiple choice',
  questionTypeTrueFalse: 'True/False',
  questionTypeInput: 'Numeric input',
  questionTypePerseus: 'Perseus',
  errorQuestionRequired: 'Question is required',
  errorMissingAnswer: 'Choose a correct answer',
  errorChooseAtLeastOneCorrectAnswer: 'Choose at least one correct answer',
  errorProvideAtLeastOneCorrectAnswer: 'Provide at least one correct answer',
  selectionCount:
    '{topicCount, plural, =0 {} one {# folder, } other {# folders, }}{resourceCount, plural, one {# resource} other {# resources}}',
};

export default createTranslator(NAMESPACE, MESSAGES);
