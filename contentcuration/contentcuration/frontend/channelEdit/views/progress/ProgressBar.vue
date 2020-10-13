<template>

  <!-- Show progress bar if progress is tracked -->
  <VLayout v-if="progressPercent !== -1 && !isDone" row align-center class="mt-3">
    <VProgressLinear
      v-model="progressPercent"
      class="ma-0"
      height="10"
      data-test="progress"
      :color="progressBarColor"
    />
    <VFlex class="text-xs-right pl-3" shrink>
      {{ $tr('progressText', {percent: Math.round(progressPercent) || '0'}) }}
    </VFlex>
  </VLayout>

</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'ProgressBar',
    computed: {
      ...mapGetters('task', ['currentTaskError', 'progressPercent']),
      isDone() {
        return this.progressPercent >= 100 && !this.currentTaskError;
      },
      progressBarColor() {
        if (this.currentTaskError) {
          return 'red';
        } else if (this.isDone) {
          return 'greenSuccess';
        } else {
          return 'primary';
        }
      },
    },
    $trs: {
      progressText: '{percent}%',
    },
  };

</script>
