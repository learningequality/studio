<template>
  <div class="progress-wrapper">
    <div>
      <div class="progressbar" :class="{failed: Boolean(error), finished: isDone}">
        <div
          class="progressbar-fill"
          role="progressbar"
          :style="{ width: `${percent}%` }"
          :indeterminate="!percent && !error"
        >
          <span class="sr-only">
            {{ $tr('completedText', { percent: percent }) }}
          </span>
        </div>
      </div>
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
      completedText: '{percent}% Complete',
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

  .progressbar {
    height: 20px;
    overflow: hidden;
    background-color: @gray-300;
    border-radius: 4px;
    &.failed {
      background-color: @error-input-color;
      .progressbar-fill {
        background-color: @red-error-color;
      }
    }
    &.finished .progressbar-fill {
      background-color: @green-success-color;
    }
    .progressbar-fill {
      float: left;
      width: 0;
      height: 100%;
      color: white;
      text-align: center;
      background-color: @blue-500;
      transition: width 0.6s ease;
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
