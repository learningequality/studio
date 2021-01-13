<template>

  <VSnackbar
    v-if="snackbarIsVisible"
    :key="key"
    :timeout="snackbarOptions.duration"
    left
    :value="snackbarIsVisible"
    @input="visibilityToggled"
  >
    {{ snackbarOptions.text }}
    <VBtn
      v-if="snackbarOptions.actionText"
      flat
      text
      @click="hideCallback"
    >
      {{ snackbarOptions.actionText }}
    </VBtn>
  </VSnackbar>

</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'GlobalSnackbar',
    computed: {
      ...mapGetters(['snackbarIsVisible', 'snackbarOptions']),
      key() {
        const options = Object.assign({}, this.snackbarOptions);
        // The forceReuse option is used to force the reuse of the snackbar
        // This is helpful when we want to just update the text but not re-run the transition
        // This is used in the disconnected snackbar
        if (options.forceReuse) {
          options.text = '';
          return JSON.stringify(options);
        }
        return JSON.stringify(options) + new Date();
      },
    },
    methods: {
      hideCallback() {
        if (this.snackbarOptions.actionCallback) {
          this.snackbarOptions.actionCallback();
        }
        this.$store.dispatch('clearSnackbar');
      },
      visibilityToggled(visible) {
        if (!visible) {
          if (this.snackbarOptions.hideCallback) {
            this.snackbarOptions.hideCallback();
          }
          this.$store.dispatch('clearSnackbar');
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
