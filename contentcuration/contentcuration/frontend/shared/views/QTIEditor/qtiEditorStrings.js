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

  orderingLabel: {
    message: 'Ordering',
    context: 'Display name for an ordering question type shown in the question type selector',
  },
  orderingDescription: {
    message: 'Learners must arrange items into the correct order.',
    context: 'Description for the ordering question type in the info modal',
  },
  correctOrderLabel: {
    message: 'Correct order',
    context: 'Section header above the ordering item list — items are shown in the correct order',
  },
  correctOrderDescription: {
    message: 'Learners will see these shuffled',
    context:
      'Subtitle under the correct order header explaining that items will be shuffled for learners',
  },
  addItemBtn: {
    message: 'Add option',
    context: 'Button that appends a new ordering item',
  },
  deleteItemBtn: {
    message: 'Delete option {number}',
    context: 'Accessible label for the delete icon button next to an ordering item row',
  },
  moveItemUpBtn: {
    message: 'Move option {number} up',
    context: 'Accessible label for the move-up icon button next to an ordering item row',
  },
  moveItemDownBtn: {
    message: 'Move option {number} down',
    context: 'Accessible label for the move-down icon button next to an ordering item row',
  },
  errorTooFewChoices: {
    message: 'At least 2 items are required for an ordering question.',
    context: 'Validation error when fewer than 2 ordering items are present',
  },
  errorEmptyItemContent: {
    message: 'Item cannot be blank',
    context: 'Validation error when an ordering item has no content',
  },
  errorDuplicateItemContent: {
    message: 'Duplicate items are not allowed',
    context: 'Validation error when two or more ordering items have identical content',
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
  editQuestionLabel: {
    message: 'Edit question',
    context: 'Accessible label for the clickable region to edit the question prompt',
  },
  editAnswerOptionLabel: {
    message: 'Edit answer option {number}',
    context: 'Accessible label for the clickable region to edit an answer choice',
  },
  deleteChoiceBtn: {
    message: 'Delete choice',
    context: 'Accessible label for the delete-choice icon button',
  },
  choiceItemLabel: {
    message: 'Choice {number}',
    context:
      'Names a choice row in its reorder controls and in the screen reader announcement after it moves',
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
  errorDuplicateAnswerContent: {
    message: 'Duplicate answers are not allowed',
    context: 'Validation error when two or more text/numeric answers have identical values',
  },
  numericLabel: {
    message: 'Numeric',
    context: 'Display name for a numeric text-entry question type',
  },
  numericDescription: {
    message: 'Learners must enter a specific number or mathematical expression.',
    context: 'Description for the numeric question type in the info modal',
  },
  textEntryLabel: {
    message: 'Text entry',
    context: 'Display name for a string text-entry question type with a required correct answer',
  },
  textEntryDescription: {
    message: 'Learners must type a specific word or phrase. Exact matches can be required.',
    context: 'Description for the text entry question type in the info modal',
  },
  freeResponseLabel: {
    message: 'Free response',
    context: 'Display name for a free-response text-entry question type',
  },
  freeResponseDescription: {
    message: 'Learners can write an open-ended response. No correct answer is enforced.',
    context: 'Description for the free response question type in the info modal',
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
    message: 'Delete answer {number}',
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
  errorParsingQuestion: {
    message: 'This question could not be loaded',
    context: 'Shown in place of the interaction editor when the QTI XML fails to parse',
  },
  // Question type selector
  typeLabel: {
    message: 'Type',
    context: 'Short label above the question type selector',
  },
  responseTypeLabel: {
    message: 'Response type',
    context: 'Label for the question type selector dropdown',
  },
  responseTypeInfoTitle: {
    message: 'Response type',
    context: 'Modal title explaining available question types',
  },
  singleChoiceDescription: {
    message: 'Learners choose one correct answer from a list of options.',
    context: 'Description of single choice question type in info modal',
  },
  multipleSelectionDescription: {
    message:
      'Learners identify all correct answers from a list, where more than one option may apply.',
    context: 'Description of multiple selection question type in info modal',
  },
  // Answer settings
  answerSettingsLabel: {
    message: 'Answer settings',
    context: 'Section header for answer configuration controls',
  },
  shuffleAnswersLabel: {
    message: 'Shuffle answers for learners',
    context: 'Checkbox label to randomize answer order',
  },
  shuffleAnswersInfoTitle: {
    message: 'Shuffle answers for learners',
    context: 'Modal title explaining shuffle behavior',
  },
  shuffleAnswersInfoBody: {
    message:
      'The order of answer choices will be randomized each time a learner sees this question. This helps prevent learners from memorizing answer positions rather than understanding the content.',
    context: 'Modal body explaining shuffle behavior',
  },
  showAnswerCountLabel: {
    message: 'Show learners how many answers to select',
    context: 'Checkbox label for displaying answer count hint',
  },
  showAnswerCountInfoTitle: {
    message: 'Show learners how many answers to select',
    context: 'Modal title explaining answer count hint',
  },
  showAnswerCountInfoBody: {
    message:
      'When enabled, learners see a hint below the answer options so they know how many answers to choose. Toggle this off to increase question difficulty.',
    context: 'Modal body explaining answer count hint',
  },
});
