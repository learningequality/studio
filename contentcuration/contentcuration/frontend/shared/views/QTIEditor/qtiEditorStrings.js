import { createTranslator } from 'shared/i18n';

export const qtiEditorStrings = createTranslator('QTIEditorStrings', {
  noQuestionsPlaceholder: {
    message: 'No questions yet',
    context: 'Shown when the question list is empty',
  },
  newQuestionBtnLabel: {
    message: 'New question',
    context: 'Button that adds a new question to the list',
  },
  questionNumberLabel: {
    message: 'Question {number} of {total}',
    context: 'Card header when card is open, e.g. "Question 2 of 5"',
  },
  questionNumberAndTypeLabel: {
    message: 'Question {number} of {total} \u2014 {type}',
    context: 'Card header when card is closed, e.g. "Question 1 of 3 \u2014 Choice"',
  },
  closeBtnLabel: {
    message: 'Close',
    context: 'Button that collapses the open question card',
  },
  questionContentPlaceholder: {
    message: 'Question content editor coming soon',
    context: 'Placeholder inside an open card until interaction editors are built',
  },
  showAnswers: {
    message: 'Show answers',
    context: 'Checkbox label to toggle displaying answers/previews',
  },
  singleSelectLabel: {
    message: 'Single Choice',
    context: 'Display name for a single-select question type',
  },
  multiSelectLabel: {
    message: 'Multiple Choice',
    context: 'Display name for a multiple-select question type',
  },
  questionLabel: {
    message: 'Question',
    context: 'Section header for the question prompt',
  },
  answersLabel: {
    message: 'Answer options',
    context: 'Section header above choice options',
  },
  answersDescriptionSingleChoice: {
    message: 'Select one correct answer',
    context: 'Instruction subtitle above single-choice options',
  },
  answersDescriptionMultipleChoice: {
    message: 'Select all correct answers',
    context: 'Instruction subtitle above multiple-choice options',
  },
  orderLabel: {
    message: 'Order',
    context: 'Display name for an order question type',
  },
  matchLabel: {
    message: 'Match',
    context: 'Display name for a match question type',
  },
  extendedTextLabel: {
    message: 'Extended text',
    context: 'Display name for an extended text question type',
  },
  unknownTypeLabel: {
    message: 'Unknown type',
    context: 'Fallback when an item has an unrecognised question type',
  },
  toolbarLabelEdit: {
    message: 'Edit',
    context: 'Action to edit the item',
  },
  toolbarLabelMoveUp: {
    message: 'Move up',
    context: 'Action to move the item up',
  },
  toolbarLabelMoveDown: {
    message: 'Move down',
    context: 'Action to move the item down',
  },
  toolbarLabelDelete: {
    message: 'Delete',
    context: 'Action to delete the item',
  },
  toolbarLabelAddAbove: {
    message: 'Add question above',
    context: 'Action to add a new question above the current one',
  },
  toolbarLabelAddBelow: {
    message: 'Add question below',
    context: 'Action to add a new question below the current one',
  },
  addChoiceBtn: {
    message: 'Add choice',
    context: 'Button that appends a new answer choice',
  },
  deleteChoiceBtn: {
    message: 'Delete choice',
    context: 'Accessible label for the delete-choice icon button',
  },
  moveChoiceUpBtn: {
    message: 'Move choice up',
    context: 'Accessible label for the move-up icon button',
  },
  moveChoiceDownBtn: {
    message: 'Move choice down',
    context: 'Accessible label for the move-down icon button',
  },
  markCorrectLabel: {
    message: 'Mark as correct answer',
    context: 'Accessible label for radio / checkbox that marks a choice as correct',
  },
  errorPromptRequired: {
    message: 'Question is required',
    context: 'Validation error shown when the prompt is empty',
  },
  errorNoCorrectAnswer: {
    message: 'Choose a correct answer',
    context: 'Validation error when no choice is marked correct',
  },
  errorTooManyCorrectAnswers: {
    message: 'Only one correct answer is allowed for single-choice questions.',
    context: 'Validation error when multiple choices are marked correct for single-select',
  },
  errorEmptyChoiceContent: {
    message: 'Answer cannot be blank',
    context: 'Validation error when an answer option is empty',
  },
  errorEmptyAnswerContent: {
    message: 'Cannot be empty',
    context: 'Validation error when a text entry answer is empty',
  },
  errorDuplicateChoiceContent: {
    message: 'Duplicate answer options are not allowed',
    context: 'Validation error when two or more answer options have identical content',
  },
  numericLabel: {
    message: 'Numeric',
    context: 'Display name for a numeric text-entry question type',
  },
  textEntryLabel: {
    message: 'Text entry',
    context: 'Display name for a string text-entry question type with a required correct answer',
  },
  freeResponseLabel: {
    message: 'Free response',
    context: 'Display name for a free-response text-entry question type',
  },
  acceptableAnswersLabel: {
    message: 'Acceptable answers',
    context: 'Section header above the list of correct numeric answer values',
  },
  acceptableAnswersDescription: {
    message: 'Enter all acceptable numeric values',
    context: 'Subtitle under the acceptable answers header for numeric questions',
  },
  acceptableAnswersDescriptionTextEntry: {
    message: 'Enter all acceptable spellings or formats',
    context: 'Subtitle under the acceptable answers header for text entry questions',
  },
  addAnswerBtn: {
    message: 'Add acceptable answer',
    context: 'Button that appends a new answer row',
  },
  deleteAnswerBtn: {
    message: 'Delete answer',
    context: 'Accessible label for the delete icon button next to an answer row',
  },
  caseSensitiveLabel: {
    message: 'Case-sensitive',
    context:
      'Checkbox label — when checked, the answer must match exact casing (e.g. "H2O" ≠ "h2o")',
  },
  answerValuePlaceholder: {
    message: 'Enter a number',
    context: 'Placeholder inside a numeric answer input field',
  },
  answerTextPlaceholder: {
    message: 'Enter an accepted answer',
    context: 'Placeholder inside a text-entry answer input field',
  },
  errorInvalidNumericValue: {
    message: 'Must be a valid number (e.g. 12, 0.5, -3.14)',
    context: 'Validation error shown when an answer value is not a valid number',
  },
});
