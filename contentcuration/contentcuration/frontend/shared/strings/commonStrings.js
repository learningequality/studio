import { createTranslator } from 'shared/i18n';

export const commonStrings = createTranslator('CommonStrings', {
  backAction: {
    message: 'Back',
    context:
      'Indicates going back to a previous step in multi-step workflows. It can be used as a label of the back button that is displayed next to the continue button.',
  },
  clearAction: {
    message: 'Clear',
    context: 'A label for an action that clears a selection or input field',
  },
  seeAllAction: {
    message: 'See all',
    context: 'A label for an action that shows all items in a list or collection',
  },
  seeLessAction: {
    message: 'See less',
    context: 'A label for an action that shows fewer items in a list or collection',
  },
  closeAction: {
    message: 'Close',
    context: 'A label for an action that closes a dialog or window',
  },
  genericErrorMessage: {
    message: 'Sorry! Something went wrong, please try again.',
    context: 'Default error message for operation errors.',
  },
  channelDetailsLabel: {
    message: 'Channel Details',
    context: 'Label for a section that displays details about a channel',
  },
});
