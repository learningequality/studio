<template>

  <VLayout v-if="progressPercent !== -1 && !isDone" row align-center class="mt-3">
    <VProgressCircular
      v-else
      :indeterminate="!task"
      :progress="progress"
      :color="$themeTokens.loading"
    />
  </VLayout>

</template>


<script>

  import { mapGetters } from 'vuex';
  import get from 'lodash/get';

  export default {
    name: 'ProgressBar',
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
      isDone() {
        return this.progressPercent >= 100 && !this.currentTaskError;
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
      currentTaskError() {
        return this.task ? get(this.task, ['metadata', 'error']) : null;
      },
      progress() {
        return this.task ? get(this.task, ['metadata', 'progress']) : 0;
      },
    },
  };

</script>
