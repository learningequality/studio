<template>

  <!-- Show progress bar if progress is tracked -->
  <VLayout v-if="progress !== -1 && !isDone" row align-center class="mt-3">
    <VProgressLinear
      v-model="progress"
      class="ma-0"
      height="10"
      data-test="progress"
      :color="progressBarColor"
    />
    <VFlex class="text-xs-right pl-3" shrink>
      {{ $tr('progressText', {percent: Math.round(progress) || '0'}) }}
    </VFlex>
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
        return this.progress >= 100 && !this.currentTaskError;
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
    $trs: {
      progressText: '{percent}%',
    },
  };

</script>
