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

  // copy/clipboard strings
  undo: 'Undo',
  cancel: 'Cancel',
  removedFromClipboard: 'Removed from clipboard',
  creatingCopy: 'Creating copy...',
  creatingCopies: 'Creating copies...',
  copyCreated: 'Copy created',
  copiesCreated: 'Copies created',
  movedTo: 'Moved to {location}',
  goToLocation: 'Go to location',
  sentToClipboard: 'Sent to clipboard',
};

export default createTranslator(NAMESPACE, MESSAGES);
