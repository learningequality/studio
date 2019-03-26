<template>

  <div class="overlay">
    <div class="message">
      <h1>{{ $tr('overlayHeader') }}</h1>
      <p>{{ $tr('overlayDescription') }}</p>
      <ProgressBar/>
      <div class="actions">
        <a class="action-text" :href="homeUrl">{{ $tr('backLink') }}</a>
        <button class="action-button">{{ $tr('stopPublishButton') }}</button>
      </div>
    </div>
  </div>

</template>


<script>

import ProgressBar from 'edit_channel/sharedComponents/ProgressBar.vue';

export default {
  name: 'PublishingOverlay',
  $trs: {
    overlayHeader: 'Publishing Channel',
    overlayDescription: 'Please wait for publishing to finish to edit this channel',
    backLink: 'Back to channels',
    stopPublishButton: 'Stop publishing'
  },
  components: {
    ProgressBar,
  },
  computed: {
    homeUrl() {
      return window.Urls.channels();
    }
  }
}
</script>


<style lang="less" scoped>
@import '../../../../less/global-variables.less';
.overlay {
  width: 100vw;
  height: calc(~"100vh" - 50px);
  position: absolute;
  background-color: rgba(256, 256, 256, 0.65);
  z-index: 10000;
  .message {
    background-color: white;
    top: 30vh;
    width: 525px;
    position: relative;
    margin: auto;
    border: 1px solid @blue-100;
    padding: 20px;
    h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-top: 0px;
    }
    p {
      font-size: 12pt;
      color: @gray-500;
      margin-bottom: 20px;
    }
    .actions {
      display: grid;
      grid-auto-flow: column;
      justify-content: space-between;
      margin-top: 30px;
      a, button {
        text-transform: uppercase;
        font-weight: bold;
      }
      a {
        padding: 5px 0px;
      }
    }
  }
}

</style>
