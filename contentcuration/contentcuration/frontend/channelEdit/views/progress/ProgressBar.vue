<template>

  <VLayout row align-center>
    <VFlex shrink>
      <Icon v-if="currentTaskError" color="red" data-test="error">
        error
      </Icon>
      <Icon v-else-if="isDone" color="greenSuccess" data-test="success">
        check_circle
      </Icon>
      <VProgressCircular
        v-else-if="progressPercent !== -1"
        color="primary"
        indeterminate
        size="24"
      />
    </VFlex>
    <VFlex grow class="px-4">
      <VProgressLinear
        v-model="progressPercent"
        :indeterminate="progressPercent === -1 && !currentTaskError"
        height="10"
        data-test="progress"
        :color="progressBarColor"
      />
    </VFlex>
    <VFlex v-if="progressPercent !== -1" class="text-xs-right" shrink>
      {{ $tr('progressText', {percent: Math.round(progressPercent)}) }}
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
        return this.progressPercent >= 100;
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
