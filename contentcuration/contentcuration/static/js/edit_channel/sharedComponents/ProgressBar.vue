<template>
  <div class="progress-wrapper">
    <div>
      <!-- Setting the colors to avoid styling with !important tags -->
      <VProgressLinear
        v-model="percent"
        :indeterminate="!percent && !error"
        :class="{failed: error, finished: isDone}"
        height="20"
        backgroundColor="#FFF"
        color="#FFF"
      />
      <div v-if="error" class="status status-error">
        {{ error }}
      </div>
      <div class="status">
        {{ message }}
      </div>
    </div>
    <div v-if="percent" class="percentage">
      {{ $tr('progressText', {percent: Math.round(percent)}) }}
    </div>
  </div>
</template>


<script>

  import State from 'edit_channel/state';

  export default {
    name: 'ProgressBar',
    $trs: {
      progressText: '{percent}%',
    },
    props: {
      taskID: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        percent: 0,
        message: '',
        error: null,
      };
    },
    computed: {
      isDone() {
        return this.percent >= 100;
      },
    },
    mounted() {
      this.checkProgress();
    },
    methods: {
      checkProgress() {
        State.Store.dispatch('checkProgress', {
          taskID: this.taskID,
          update: this.updateProgress,
        });
      },
      cancelTask() {
        State.Store.dispatch('cancelTask', {
          taskID: this.taskID,
        }).then(() => {
          this.$emit('cancelled');
        });
      },
      updateProgress(data) {
        if (data.error) {
          this.error = data.error;
          this.$emit('failed');
        } else {
          this.message = data.message;
          this.percent = Math.min(100, data.percent * 100);
          if (this.percent >= 100) {
            this.$emit('finished');
          }
        }
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
