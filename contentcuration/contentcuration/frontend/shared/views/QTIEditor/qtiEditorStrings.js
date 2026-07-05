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
  singleChoiceLabel: {
    message: 'Single Choice',
    context: 'Display name for a single-select question type',
  },
  multipleChoiceLabel: {
    message: 'Multiple Choice',
    context: 'Display name for a multiple-select question type',
  },
  questionLabel: {
    message: 'Question',
    context: 'Section header for the question prompt',
  },
  answersLabelSingleChoice: {
    message: 'Answer options \u2014 select one correct answer',
    context: 'Section header above single-choice options',
  },
  answersLabelMultipleChoice: {
    message: 'Answer options \u2014 select all correct answers',
    context: 'Section header above multiple-choice options',
  },
  orderLabel: {
    message: 'Order',
    context: 'Display name for an order question type',
  },
  matchLabel: {
    message: 'Match',
    context: 'Display name for a match question type',
  },
  textEntryLabel: {
    message: 'Text entry',
    context: 'Display name for a text entry question type',
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
  promptPlaceholder: {
    message: 'Enter question prompt…',
    context: 'Placeholder text inside the prompt rich-text editor',
  },
  choiceContentPlaceholder: {
    message: 'Enter answer option…',
    context: 'Placeholder text inside a choice rich-text editor',
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
  errorDuplicateChoiceContent: {
    message: 'Duplicate answer options are not allowed',
    context: 'Validation error when two or more answer options have identical content',
  },
  errorTooFewChoices: {
    message: 'At least two answer options are required.',
    context: 'Validation error when fewer than two choices exist',
  },
});
