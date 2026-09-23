import { commonStrings } from 'shared/strings/commonStrings';

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
