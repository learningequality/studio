import { watch } from 'vue';
import isEqual from 'lodash/isEqual';

export function useInteractionUpdates(workingInteraction, props, emit) {
  watch(
    workingInteraction,
    (newVal, oldVal) => {
      if (props.mode !== 'edit' || isEqual(newVal, oldVal)) return;
      emit('update:interaction', newVal);
    },
    { flush: 'sync' },
  );
}
