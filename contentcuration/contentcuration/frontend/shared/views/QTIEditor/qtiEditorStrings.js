import { createTranslator } from 'shared/i18n';

const NAMESPACE = 'QTIEditorStrings';

const MESSAGES = {
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
  toolbarItemLabel: {
    message: 'question',
    context: 'Noun used by the toolbar for accessible action labels',
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
  interactionTypeChoice: {
    message: 'Choice',
    context: 'Display name for choiceInteraction',
  },
  interactionTypeOrder: {
    message: 'Order',
    context: 'Display name for orderInteraction',
  },
  interactionTypeMatch: {
    message: 'Match',
    context: 'Display name for matchInteraction',
  },
  interactionTypeTextEntry: {
    message: 'Text entry',
    context: 'Display name for textEntryInteraction',
  },
  interactionTypeExtendedText: {
    message: 'Extended text',
    context: 'Display name for extendedTextInteraction',
  },
  interactionTypeUnknown: {
    message: 'Unknown type',
    context: 'Fallback when an item has an unrecognised interaction type',
  },
};

export const qtiEditorStrings = createTranslator(NAMESPACE, MESSAGES);

export function useQTIStr(key, args) {
  return qtiEditorStrings.$tr(key, args);
}
