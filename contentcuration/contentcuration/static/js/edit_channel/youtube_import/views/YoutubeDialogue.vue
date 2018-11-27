<template>
  <div>
    <div>
      <slot />
    </div>

    <div id="youtube_bottom_container">
      <a class="action-text uppercase" data-dismiss="modal">
        <span>{{ $tr('cancelButtonLabel') }}</span>
      </a>
    </div>
  </div>
</template>


<script>


export default {
  name: 'YoutubeDialogue',
  $trs: {
    cancelButtonLabel: 'Cancel',
  }
}


</script>

<style lang="less">
  @import "../../../../less/modal-styles.less";
  @import "../../../../less/global-variables.less";
  #youtube_bottom_container {
    height: 30px;
  }
  .error {
    color: @red-error-color;
    font-weight: bold;
  }

  button.action-button[disabled] {
    opacity: 0.75;
  }

  @keyframes spin {
    from { transform: scale(1) rotate(0deg);}
    to { transform: scale(1) rotate(360deg);}
  }

  .yt-upload-progress{
    animation: spin 1.5s infinite linear;
    font-size: 13pt;
    vertical-align: sub;
    margin-left: 5px;
  }
</style>
