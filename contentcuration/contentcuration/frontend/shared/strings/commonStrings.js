import { createTranslator } from 'shared/i18n';

export const commonStrings = createTranslator('CommonStrings', {
  backAction: {
    message: 'Back',
    context:
      'Indicates going back to a previous step in multi-step workflows. It can be used as a label of the back button that is displayed next to the continue button.',
  },
  closeAction: {
    message: 'Close',
    context: 'A label for an action that closes a dialog or window',
  },
});
