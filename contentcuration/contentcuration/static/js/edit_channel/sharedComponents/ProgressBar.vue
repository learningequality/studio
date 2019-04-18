<template>
  <div class="progress-wrapper">
    <div>
      <div class="progressbar">
        <div class="progressbar-fill" role="progressbar" :style="{ width: `${percent}%` }">
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
    <div class="percentage">
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
        });
      },
      updateProgress(data) {
        if (data.error) {
          this.error = data.error;
        } else {
          this.message = data.message;
          this.percent = data.percent;
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
