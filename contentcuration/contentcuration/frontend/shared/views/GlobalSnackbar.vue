<template>

  <KSnackbar
    :isOpen="snackbarIsVisible"
    :text="snackbarOptions.text"
    :actionText="snackbarOptions.actionText"
    :duration="snackbarOptions.duration"
    :autoDismiss="snackbarOptions.autoDismiss"
    :bottomOffset="snackbarOptions.bottomOffset"
    :backdrop="snackbarOptions.backdrop"
    :autofocus="snackbarOptions.autofocus"
    :announce="snackbarOptions.announce"
    :assertive="snackbarOptions.assertive"
    @close="handleClose"
    @actionClick="handleActionClick"
    @blur="snackbarOptions.onBlur && snackbarOptions.onBlur($event)"
  />

</template>


<script>

  import KSnackbar from 'kolibri-design-system/lib/KSnackbar/KSnackbar.vue';
  import useKSnackbar from 'kolibri-design-system/lib/composables/useKSnackbar';

  export default {
    name: 'GlobalSnackbar',
    components: {
      KSnackbar,
    },
    setup() {
      const { snackbarIsVisible, snackbarOptions, clearSnackbar } = useKSnackbar();

      return {
        snackbarIsVisible,
        snackbarOptions,
        clearSnackbar,
      };
    },
    methods: {
      handleClose() {
        if (this.snackbarOptions && this.snackbarOptions.hideCallback) {
          this.snackbarOptions.hideCallback();
        }
        this.clearSnackbar();
      },
      handleActionClick(event) {
        if (this.snackbarOptions && this.snackbarOptions.actionCallback) {
          this.snackbarOptions.actionCallback(event);
        }
        this.clearSnackbar();
      },
    },
  };

</script>
