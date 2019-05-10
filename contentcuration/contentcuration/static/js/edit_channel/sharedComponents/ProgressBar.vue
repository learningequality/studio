<template>
  <div class="progress-wrapper">
    <div>
      <!-- Setting the colors to avoid styling with !important tags -->
      <VProgressLinear
        v-model="progressPercent"
        :indeterminate="progressPercent === -1 && !currentTaskError"
        :class="{failed: currentTaskError, finished: isDone}"
        height="20"
        backgroundColor="#FFF"
        color="#FFF"
      />
    </div>
    <div v-if="progressPercent" class="percentage">
      {{ $tr('progressText', {percent: Math.round(progressPercent)}) }}
    </div>
  </div>
</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'ProgressBar',
    $trs: {
      progressText: '{percent}%',
    },
    computed: {
      ...mapGetters(['currentTaskError', 'progressPercent']),
      isDone() {
        return this.progressPercent >= 100;
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../less/global-variables.less';

  .progress-wrapper {
    display: grid;
    grid-template-columns: 1fr max-content;
    grid-auto-flow: column;
  }

  /deep/ .v-progress-linear {
    margin: 0;
    .v-progress-linear__background {
      background-color: @blue-100 !important;
    }
    .v-progress-linear__bar div {
      background-color: @blue-500 !important;
    }
    &.failed {
      .v-progress-linear__background {
        background-color: @error-input-color !important;
      }
      .v-progress-linear__bar div {
        background-color: @red-error-color !important;
      }
    }
    &.finished .v-progress-linear__bar div {
      background-color: @green-success-color !important;
    }
  }

  .status {
    margin-top: 5px;
    font-style: italic;
    color: @gray-500;
    &.status-error {
      font-weight: bold;
      color: @red-error-color;
    }
  }

  .percentage {
    padding-left: 10px;
    font-weight: bold;
    color: @gray-500;
  }

</style>
