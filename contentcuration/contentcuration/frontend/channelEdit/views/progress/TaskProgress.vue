<template>

  <VProgressCircular
    :indeterminate="!task"
    :progress="progress"
    :color="progressBarColor"
  />

</template>


<script>

  import { mapGetters } from 'vuex';
  import get from 'lodash/get';

  export default {
    name: 'TaskProgress',
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
      currentTaskError() {
        return this.task ? get(this.task, ['metadata', 'error']) : null;
      },
      progress() {
        return this.task ? get(this.task, ['metadata', 'progress']) : 0;
      },
    },
  };

</script>
