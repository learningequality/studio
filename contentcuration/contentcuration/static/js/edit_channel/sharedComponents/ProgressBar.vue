<template>
  <div class="progress-wrapper">
    <div>
      <div class="progressbar">
        <div class="progressbar-fill" role="progressbar" :style="{ width: `${percent}%` }">
          <span class="sr-only">{{$tr('completedText', { percent: percent })}}</span>
        </div>
      </div>
      <div class="status">Publishing item 10/20</div>
    </div>
    <div class="percentage">
      50%
    </div>
  </div>

</template>


<script>

export default {
  name: 'ProgressBar',
  $trs: {
    completedText: "{percent}% Complete"
  },
  computed: {
    percent() {
      return 50
    }
  }
}
</script>


<style lang="less" scoped>
@import '../../../less/global-variables.less';

.progress-wrapper {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: 1fr max-content;
}

.progressbar {
  overflow: hidden;
  height: 20px;
  background-color: @gray-300;
  border-radius: 4px;
  .progressbar-fill {
    float: left;
    width: 0;
    height: 100%;
    color: white;
    text-align: center;
    background-color: @blue-500;
    transition: width .6s ease;
  }
}

.status {
  color: @gray-500;
  font-style: italic;
  margin-top: 5px;
}

.percentage {
  color: @gray-500;
  font-weight: bold;
  padding-left: 10px;
}

</style>
