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

<style lang="less" scoped>

@import "../../../../less/modal-styles.less";
@import "../../../../less/global-variables.less";
#youtube_bottom_container {
  height: 30px;
}
</style>
