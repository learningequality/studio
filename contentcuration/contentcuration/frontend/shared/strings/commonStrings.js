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
  previewAction: {
    message: 'Preview',
    context: 'A label for an action that opens a preview of content',
  },
  dismissAction: {
    message: 'Dismiss',
    context: 'A label for an action that dismisses a notification or message',
  },
  copyChannelTokenAction: {
    message: 'Copy channel token',
    context: 'A label for an action that copies the channel token to the clipboard',
  },
  optionsLabel: {
    message: 'Options',
    context: 'Tooltip for the generic options menu icon',
  },
  clearAllAction: {
    message: 'Clear all',
    context: 'Accessible label for the button that clears every selection in a select field',
  },
  openMenuAction: {
    message: 'Open menu',
    context: 'Accessible label for the button that opens a dropdown menu',
  },
  closeMenuAction: {
    message: 'Close menu',
    context: 'Accessible label for the button that closes a dropdown menu',
  },
  optionsClickableLabel: {
    message: 'Options are clickable',
    context: 'Announced to screen reader users when a list of selectable options appears',
  },
  allOptionsSelectedLabel: {
    message: 'All options selected',
    context: 'Announced when every option in a list is selected',
  },
  allOptionsDeselectedLabel: {
    message: 'No options selected',
    context: 'Announced when no options in a list are selected',
  },
  optionDeselectedLabel: {
    message: 'Option deselected',
    context: 'Announced when an option is removed from the selection',
  },
  partiallySelectedLabel: {
    message: 'Partially selected',
    context: 'Announced for an option when only some of the options under it are selected',
  },
  optionSelectedLabel: {
    message: 'Selected {label}',
    context: 'Announced when an option is selected. {label} is the name of the option',
  },
  optionRemovedLabel: {
    message: 'Removed {label}',
    context: 'Announced when an option is removed. {label} is the name of the option',
  },
});
