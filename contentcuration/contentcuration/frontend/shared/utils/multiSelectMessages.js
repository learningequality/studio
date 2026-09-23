import { commonStrings } from 'shared/strings/commonStrings';

/**
 * Builds the `messages` prop for KDS's KMultiSelect out of the standard
 * commonStrings, so each consumer only needs to supply the parts that
 * genuinely vary: the clear-button label, and the itemsSelected/cleared
 * counts, which need access to the consuming component's own translator
 * for their plural forms.
 */
export function createMultiSelectMessages({
  clearText,
  itemsSelected,
  cleared,
  partiallySelected = false,
}) {
  const {
    openMenuAction$,
    closeMenuAction$,
    optionsClickableLabel$,
    allOptionsSelectedLabel$,
    allOptionsDeselectedLabel$,
    optionDeselectedLabel$,
    optionSelectedLabel$,
    optionRemovedLabel$,
    partiallySelectedLabel$,
  } = commonStrings;

  const messages = {
    clearText,
    open: openMenuAction$,
    close: closeMenuAction$,
    clickable: optionsClickableLabel$,
    allOptionsSelected: allOptionsSelectedLabel$,
    allOptionsDeselected: allOptionsDeselectedLabel$,
    optionDeselected: optionDeselectedLabel$,
    itemsSelected,
    selected: optionSelectedLabel$,
    removed: optionRemovedLabel$,
    cleared,
  };

  if (partiallySelected) {
    messages.partiallySelected = partiallySelectedLabel$;
  }

  return messages;
}
