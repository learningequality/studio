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
  creatingCopies: 'Creating {count, plural,\n =1 {# copy}\n other {# copies}}...',
  creatingClipboardCopies:
    'Creating {count, plural,\n =1 {# copy}\n other {# copies}} on clipboard...',
  copiedItems: 'Copied {count, plural,\n =1 {# item}\n other {# items}}',
  copiedTopics: 'Copied {count, plural,\n =1 {# topic}\n other {# topics}}',
  copiedResources: 'Copied {count, plural,\n =1 {# resource}\n other {# resources}}',
  copiedItemsToClipboard: 'Copied {count, plural,\n =1 {# item}\n other {# items}} to clipboard',
  copiedTopicsToClipboard: 'Copied {count, plural,\n =1 {# topic}\n other {# topics}} to clipboard',
  copiedResourcesToClipboard:
    'Copied {count, plural,\n =1 {# resource}\n other {# resources}} to clipboard',

  removingItems: 'Removing {count, plural,\n =1 {# item}\n other {# items}}...',
  removedItems: 'Sent {count, plural,\n =1 {# item}\n other {# items}} to the trash',
  removedFromClipboard: 'Removed from clipboard',
};

export default createTranslator(NAMESPACE, MESSAGES);
