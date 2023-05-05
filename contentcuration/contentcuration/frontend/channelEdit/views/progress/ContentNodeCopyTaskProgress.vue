<template>

  <VProgressCircular
    :indeterminate="!task || !progress"
    :progress="progress"
    :color="progressBarColor"
    v-bind="$attrs"
  />

</template>


<script>

  import { mapGetters } from 'vuex';
  import get from 'lodash/get';

  export default {
    name: 'ContentNodeCopyTaskProgress',
    props: {
      taskId: {
        type: String,
        default: null,
      },
    },
    computed: {
      ...mapGetters('task', ['getAsyncTask']),
      task() {
        return this.getAsyncTask(this.taskId);
      },
      progressBarColor() {
        if (this.currentTaskError) {
          return this.$themeTokens.error;
        } else if (this.isDone) {
          return this.$themeTokens.success;
        } else {
          return this.$themeTokens.loading;
        }
      },
      isDone() {
        return this.progress >= 100 && !this.currentTaskError;
      },
      currentTaskError() {
        return this.task ? get(this.task, ['traceback']) : null;
      },
      progress() {
        return this.task ? get(this.task, ['progress']) : 0;
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      /**
       * String for handling copy failures
       */
      copyErrorTopic: 'Some resources failed to copy',
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>
