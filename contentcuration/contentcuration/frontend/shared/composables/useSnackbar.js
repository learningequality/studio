import { computed } from 'vue';
import useStore from 'shared/composables/useStore';

// Composable wrapping snackbar Vuex store actions and getters
export default function useSnackbar() {
  const store = useStore();
  const snackbarIsVisible = computed(() => store.getters.snackbarIsVisible);
  const snackbarOptions = computed(() => store.getters.snackbarOptions);

  const createSnackbar = (options = {}) => {
    let snackbarOptions;
    if (typeof options === 'string') {
      snackbarOptions = { text: options, autoDismiss: true };
    } else {
      snackbarOptions = options;
    }
    return store.dispatch('showSnackbar', snackbarOptions);
  };

  const clearSnackbar = () => {
    return store.dispatch('clearSnackbar');
  };

  return {
    snackbarIsVisible,
    snackbarOptions,
    createSnackbar,
    clearSnackbar,
  };
}
