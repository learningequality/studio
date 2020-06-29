<template>

  <VLayout row align-center>
    <VFlex xs1>
      <Icon v-if="currentTaskError" large color="red" data-test="error">
        error
      </Icon>
      <Icon v-else-if="isDone" large color="greenSuccess" data-test="success">
        check_circle
      </Icon>
      <VProgressCircular v-else indeterminate color="primary" />
    </VFlex>
    <VFlex xs11 class="px-4">
      <div v-if="text" class="body-1">
        {{ text }}
      </div>
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
    </VFlex>

  </VLayout>

</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'ProgressBar',
    props: {
      text: {
        type: String,
        required: false,
      },
    },
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
