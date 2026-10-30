import { watch } from 'vue';
import isEqual from 'lodash/isEqual';

export function useInteractionUpdates(workingInteraction, getMode, onUpdate) {
  watch(
    workingInteraction,
    (newVal, oldVal) => {
      // Rebuilding yields a fresh object on every state change, so compare by
      // value — reopening an editor or retyping the same text is not a change.
      if (getMode() !== 'edit' || isEqual(newVal, oldVal)) return;
      onUpdate(newVal);
    },
    // QTIItemEditor saves an update only if it arrives while the card is in edit
    // mode, so an edit made as the card closes must be reported before the mode
    // change lands, not on the next flush.
    { flush: 'sync' },
  );
}
