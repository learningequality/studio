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
});
